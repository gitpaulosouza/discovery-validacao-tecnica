#!/usr/bin/env node
// Security Gate — Trivy report parser.
//
// Reads one or more Trivy `--format json` filesystem-scan results and prints a
// human-readable Security Gate report. For every vulnerable library it shows:
//   - the installed version,
//   - the highest severity found,
//   - the version it must be bumped to (the max FixedVersion across all of the
//     package's advisories, so a single bump clears every CVE on that lib),
//   - whether the lib is a DIRECT dependency (declared in package.json — bump
//     there) or TRANSITIVE (pulled by another package — use an `overrides`).
//
// Exit code is 0 when no finding reaches the fail threshold, 1 otherwise — this
// is what turns the script into a *gate*.
//
// Usage:
//   node security-report.mjs --threshold HIGH \
//     "back-end::back-end/.security/trivy-back.json::back-end/package.json" \
//     "front-end::front-end/.security/trivy-front.json::front-end/package.json"
//
// Each positional arg is "<label>::<trivyJsonPath>::<packageJsonPath>".

import { readFileSync, writeFileSync } from 'node:fs';

const SEVERITY_ORDER = ['UNKNOWN', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const sevRank = (s) => {
  const i = SEVERITY_ORDER.indexOf(String(s || 'UNKNOWN').toUpperCase());
  return i === -1 ? 0 : i;
};

// Trivy reports CVSS per vendor (ghsa, nvd, redhat…). Take the highest V3/V2
// score available so the report shows the worst-case rating.
const bestCvss = (cvssObj) => {
  if (!cvssObj || typeof cvssObj !== 'object') return null;
  let best = null;
  for (const entry of Object.values(cvssObj)) {
    const score = entry?.V3Score ?? entry?.V2Score;
    if (typeof score === 'number' && (best === null || score > best)) best = score;
  }
  return best;
};

const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};
const noColor = process.env.NO_COLOR || !process.stdout.isTTY;
const paint = (color, text) => (noColor ? text : `${color}${text}${C.reset}`);

const SEV_COLOR = {
  CRITICAL: C.magenta,
  HIGH: C.red,
  MEDIUM: C.yellow,
  LOW: C.cyan,
  UNKNOWN: C.dim,
};

function parseArgs(argv) {
  let threshold = 'HIGH';
  let detailed = false;
  let markdown = null;
  const targets = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--threshold') {
      threshold = String(argv[++i] || 'HIGH').toUpperCase();
    } else if (a === '--detailed') {
      detailed = true;
    } else if (a === '--markdown') {
      markdown = String(argv[++i] || '');
    } else {
      const [label, trivyPath, pkgPath] = a.split('::');
      targets.push({ label, trivyPath, pkgPath });
    }
  }
  return { threshold, detailed, markdown, targets };
}

// Best-version picker: compare dotted numeric versions, ignoring pre-release
// noise. Returns the "larger" of two FixedVersion strings.
function compareVersions(a, b) {
  const norm = (v) =>
    String(v)
      .replace(/^[^\d]*/, '')
      .split(/[.+-]/)
      .map((n) => (Number.isNaN(Number(n)) ? n : Number(n)));
  const pa = norm(a);
  const pb = norm(b);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (x === y) continue;
    if (typeof x === 'number' && typeof y === 'number') return x - y;
    return String(x) > String(y) ? 1 : -1;
  }
  return 0;
}

// Trivy may list several FixedVersion candidates per advisory ("1.2.4, 1.3.1").
// Pick the lowest one that still fixes it — least disruptive — but across all
// advisories on the package we keep the highest of those minimums.
function pickFixedVersion(current, candidatesCsv) {
  const cands = String(candidatesCsv || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (cands.length === 0) return null;
  cands.sort(compareVersions);
  // lowest candidate strictly greater than current, else the lowest candidate
  const greater = cands.find((c) => compareVersions(c, current) > 0);
  return greater || cands[0];
}

// Trivy's Title sometimes carries raw markdown (headings, line breaks) from the
// advisory body. Flatten it to a single clean line, capped for readability.
function cleanTitle(raw) {
  const t = String(raw || '')
    .replace(/[#*`>_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return t.length > 160 ? `${t.slice(0, 157)}…` : t;
}

// One-line plain-text summary of an advisory description (for the console).
function descOneLine(raw, max = 240) {
  let t = String(raw || '')
    .replace(/^#+\s*(summary|details|impact|resumo)\s*:?/gim, '') // drop section headers
    .replace(/[#*`>_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!t) return '';
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

// Multi-paragraph, lightly-formatted description for the markdown document.
// Keeps the advisory's structure (Summary / Details / Impact) as bold labels
// and renders the body as a blockquote so it reads well in any viewer.
function descBlock(raw, max = 900) {
  let t = String(raw || '').trim();
  if (!t) return '';
  if (t.length > max) t = `${t.slice(0, max - 1).trim()}…`;
  const formatted = t
    .replace(/^#{1,6}\s*(.+)$/gm, (_, h) => `**${h.trim()}:**`) // ### Summary → **Summary:**
    .replace(/\r/g, '')
    .split('\n')
    .map((l) => l.trimEnd());
  // collapse 3+ blank lines into one, prefix every line with "> "
  const out = [];
  let blank = false;
  for (const l of formatted) {
    if (l.trim() === '') {
      if (!blank) out.push('>');
      blank = true;
    } else {
      out.push(`> ${l}`);
      blank = false;
    }
  }
  return out.join('\n');
}

// MITRE CWE reference link (e.g. CWE-863 → definitions/863.html).
function cweLink(cwe) {
  const n = String(cwe).match(/(\d+)/);
  return n
    ? `[${cwe}](https://cwe.mitre.org/data/definitions/${n[1]}.html)`
    : cwe;
}

// Returns a Map of declared dependency name -> version spec (e.g. "^15.0.0"),
// so the report can show the *exact line* to change in package.json.
function loadDeclaredDeps(pkgPath) {
  const map = new Map();
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    for (const group of [
      pkg.dependencies,
      pkg.devDependencies,
      pkg.optionalDependencies,
      pkg.peerDependencies,
    ]) {
      for (const [name, spec] of Object.entries(group || {})) {
        if (!map.has(name)) map.set(name, spec);
      }
    }
  } catch {
    /* no package.json — leave empty */
  }
  return map;
}

// Lightweight semver-range check for the common npm operators (^, ~, exact,
// >=, *). Returns true if `version` is already allowed by `spec`. On an
// unparseable/complex range it returns false, so we fall back to recommending
// an explicit bump (the safe choice).
function rangeAllows(spec, version) {
  if (!spec) return false;
  const s = String(spec).trim();
  if (s === '*' || s === 'x' || s === 'latest' || s === '') return true;
  const V = (v) => {
    const p = String(v)
      .replace(/^[^\d]*/, '')
      .split(/[.+-]/)
      .map((n) => (Number.isNaN(Number(n)) ? 0 : Number(n)));
    return [p[0] || 0, p[1] || 0, p[2] || 0];
  };
  const cmp = (a, b) => {
    const A = V(a);
    const B = V(b);
    for (let i = 0; i < 3; i++) if (A[i] !== B[i]) return A[i] - B[i];
    return 0;
  };
  if (/^\d/.test(s)) return cmp(s, version) === 0; // exact pin
  if (s.startsWith('>=')) return cmp(version, s.slice(2)) >= 0;
  if (s.startsWith('^')) {
    const b = V(s.slice(1));
    if (cmp(version, s.slice(1)) < 0) return false;
    const v = V(version);
    if (b[0] > 0) return v[0] === b[0]; // ^1.2.3 → <2.0.0
    if (b[1] > 0) return v[0] === 0 && v[1] === b[1]; // ^0.2.3 → <0.3.0
    return v[0] === 0 && v[1] === 0 && v[2] === b[2]; // ^0.0.3
  }
  if (s.startsWith('~')) {
    const b = V(s.slice(1));
    if (cmp(version, s.slice(1)) < 0) return false;
    const v = V(version);
    return v[0] === b[0] && v[1] === b[1]; // ~1.2.3 → <1.3.0
  }
  return false;
}

function collectFindings(trivyPath, declared) {
  let report;
  try {
    report = JSON.parse(readFileSync(trivyPath, 'utf8'));
  } catch (err) {
    throw new Error(`could not read Trivy report at ${trivyPath}: ${err.message}`);
  }
  const byPkg = new Map();
  for (const result of report.Results || []) {
    for (const v of result.Vulnerabilities || []) {
      const name = v.PkgName;
      if (!name) continue;
      const key = `${name}@${v.InstalledVersion}`;
      const existing = byPkg.get(key) || {
        name,
        installed: v.InstalledVersion,
        // Trivy >=0.50 exposes Relationship; fall back to package.json check.
        direct:
          v.Relationship === 'direct' || declared.has(name),
        declaredSpec: declared.get(name) || null,
        maxSeverity: 'UNKNOWN',
        fixed: null,
        cves: new Set(),
        noFix: false,
        vulns: [],
      };
      existing.cves.add(v.VulnerabilityID);
      if (sevRank(v.Severity) > sevRank(existing.maxSeverity)) {
        existing.maxSeverity = String(v.Severity || 'UNKNOWN').toUpperCase();
      }
      const vulnFixed = v.FixedVersion
        ? pickFixedVersion(v.InstalledVersion, v.FixedVersion)
        : null;
      if (vulnFixed) {
        if (!existing.fixed || compareVersions(vulnFixed, existing.fixed) > 0) {
          existing.fixed = vulnFixed;
        }
      } else {
        existing.noFix = true;
      }
      existing.vulns.push({
        id: v.VulnerabilityID,
        severity: String(v.Severity || 'UNKNOWN').toUpperCase(),
        title: cleanTitle(v.Title),
        description: (v.Description || '').trim(),
        cvss: bestCvss(v.CVSS),
        cwe: Array.isArray(v.CweIDs) ? v.CweIDs : [],
        url: v.PrimaryURL || '',
        references: Array.isArray(v.References) ? v.References : [],
        published: (v.PublishedDate || '').slice(0, 10),
        fixed: vulnFixed,
      });
      byPkg.set(key, existing);
    }
  }
  // de-dup CVEs that Trivy may list more than once per package
  for (const p of byPkg.values()) {
    const seen = new Set();
    p.vulns = p.vulns.filter((x) => (seen.has(x.id) ? false : seen.add(x.id)));
    p.vulns.sort((a, b) => sevRank(b.severity) - sevRank(a.severity));
  }
  return [...byPkg.values()];
}

function renderTarget(label, findings) {
  console.log('');
  console.log(paint(C.bold, `▸ ${label}`));
  if (findings.length === 0) {
    console.log(paint(C.green, '  ✓ no known vulnerabilities'));
    return;
  }
  findings.sort(
    (a, b) =>
      sevRank(b.maxSeverity) - sevRank(a.maxSeverity) ||
      a.name.localeCompare(b.name),
  );
  for (const f of findings) {
    const sev = paint(
      SEV_COLOR[f.maxSeverity] || C.dim,
      f.maxSeverity.padEnd(8),
    );
    const scope = f.direct
      ? paint(C.bold, 'direct')
      : paint(C.dim, 'transitive');
    const fix = f.fixed
      ? paint(C.green, f.fixed)
      : paint(C.red, 'no fix available');
    console.log(
      `  ${sev} ${f.name}@${f.installed}  →  ${fix}  ${paint(C.dim, `(${scope}, ${f.cves.size} CVE)`)}`,
    );
  }
}

// Shared remediation model used by both the console and the markdown report.
function computeRemediation(allTargets) {
  const actionable = [];
  for (const t of allTargets) {
    for (const f of t.findings) {
      if (f.fixed)
        actionable.push({
          ...f,
          label: t.label,
          // already-covered = the declared range permits the fixed version, so
          // `npm update` is enough; no package.json edit required.
          covered: f.direct && rangeAllows(f.declaredSpec, f.fixed),
        });
    }
  }
  const direct = actionable.filter((f) => f.direct);
  const transitive = actionable.filter((f) => !f.direct);
  const transitiveByLabel = new Map();
  for (const f of transitive) {
    if (!transitiveByLabel.has(f.label)) transitiveByLabel.set(f.label, []);
    transitiveByLabel.get(f.label).push(f);
  }
  return { any: actionable.length > 0, direct, transitiveByLabel };
}

function renderRemediation(allTargets) {
  const { any, direct, transitiveByLabel } = computeRemediation(allTargets);
  if (!any) return;

  console.log('');
  console.log(paint(C.bold, '─── Como corrigir (package.json) ───'));

  if (direct.length) {
    console.log('');
    console.log(paint(C.bold, 'Dependências diretas — atualize a versão:'));
    for (const f of direct) {
      const target = paint(C.green, `"^${f.fixed}"`);
      if (f.covered) {
        // declared range already allows the fix → just refresh the lockfile
        console.log(
          `  [${f.label}] ${f.name}: a faixa atual ${paint(C.cyan, `"${f.declaredSpec}"`)} já permite ${paint(C.green, f.fixed)} → rode ${paint(C.bold, `(cd ${f.label} && npm update ${f.name})`)} ${paint(C.dim, '(ou trave o piso em ' + target + ')')}`,
        );
      } else {
        const from = f.declaredSpec
          ? paint(C.cyan, `"${f.declaredSpec}"`)
          : paint(C.dim, `(instalada ${f.installed})`);
        console.log(
          `  [${f.label}] ${f.name}: ${from} → ${target} ${paint(C.dim, '(altere no package.json e rode npm install)')}`,
        );
      }
    }
  }
  if (transitiveByLabel.size) {
    console.log('');
    console.log(
      paint(C.bold, 'Dependências transitivas — fixe via "overrides":'),
    );
    for (const [label, fs] of transitiveByLabel) {
      const overrides = Object.fromEntries(
        fs.map((f) => [f.name, `>=${f.fixed}`]),
      );
      console.log(`  [${label}] adicione ao package.json:`);
      console.log(
        paint(
          C.dim,
          JSON.stringify({ overrides }, null, 2)
            .split('\n')
            .map((l) => `    ${l}`)
            .join('\n'),
        ),
      );
    }
  }
}

function renderDetailed(allTargets) {
  console.log('');
  console.log(paint(C.bold, '─── Detalhes das vulnerabilidades ───'));
  for (const t of allTargets) {
    if (t.findings.length === 0) continue;
    console.log('');
    console.log(paint(C.bold, `▸ ${t.label}`));
    for (const f of t.findings) {
      const scope = f.direct ? 'direct' : 'transitive';
      console.log(
        `  ${paint(C.bold, f.name)}@${f.installed} ${paint(C.dim, `(${scope})`)} — corrigir em: ${
          f.fixed ? paint(C.green, f.fixed) : paint(C.red, 'sem correção')
        }`,
      );
      for (const v of f.vulns) {
        const sev = paint(SEV_COLOR[v.severity] || C.dim, v.severity);
        const cvss = v.cvss != null ? ` CVSS ${v.cvss}` : '';
        const cwe = v.cwe.length ? ` ${v.cwe.join(',')}` : '';
        console.log(`    • [${sev}${cvss}] ${v.id}${cwe}`);
        if (v.title) console.log(`      ${v.title}`);
        const desc = descOneLine(v.description, 260);
        if (desc) console.log(paint(C.dim, `      ${desc}`));
        const meta = [
          v.fixed ? `fix ${v.fixed}` : 'sem fix',
          v.published ? `publicado ${v.published}` : '',
        ]
          .filter(Boolean)
          .join(' · ');
        console.log(paint(C.dim, `      ${meta}`));
        if (v.url) console.log(paint(C.dim, `      ${v.url}`));
      }
    }
  }
}

function buildMarkdown(allTargets, threshold, total, blocking) {
  const lines = [];
  lines.push('# Security Gate — Relatório de Vulnerabilidades');
  lines.push('');
  lines.push(
    'Verificação automática das dependências (libs) de **back-end** e ' +
      '**front-end** contra bancos de vulnerabilidades conhecidas. Para cada ' +
      'lib afetada o relatório descreve **o que é a falha**, **qual o risco** e ' +
      '**para qual versão atualizar** no `package.json`.',
  );
  lines.push('');

  // Status banner — primeira coisa que se lê.
  if (blocking > 0) {
    lines.push(
      `> ❌ **Security Gate FALHOU** — ${blocking} de ${total} vulnerabilidade(s) ` +
        `estão no nível **${threshold}** ou superior e precisam ser tratadas antes do merge.`,
    );
  } else {
    lines.push(
      `> ✅ **Security Gate PASSOU** — nenhuma vulnerabilidade no nível **${threshold}** ` +
        `ou superior (${total} finding(s) abaixo do threshold).`,
    );
  }
  lines.push('');
  lines.push(`- **Engine:** Trivy (agrega GHSA + OSV + NVD/CVE)`);
  lines.push(`- **Threshold de bloqueio:** ${threshold} ou superior`);
  lines.push(`- **Total de vulnerabilidades:** ${total}`);
  lines.push(`- **No/acima do threshold:** ${blocking}`);
  lines.push('');

  // Legenda — torna o relatório auto-explicativo para quem não é especialista.
  lines.push('<details><summary>📖 Como ler este relatório</summary>');
  lines.push('');
  lines.push('- **Severidade** — impacto potencial da falha:');
  lines.push('  - 🟣 **CRITICAL** / 🔴 **HIGH** → bloqueiam o gate; corrija já.');
  lines.push('  - 🟡 **MEDIUM** / 🔵 **LOW** → informativo (ajuste o threshold para bloquear).');
  lines.push(
    '- **CVSS** — nota de 0 a 10 do *Common Vulnerability Scoring System* ' +
      '(quanto maior, pior).',
  );
  lines.push(
    '- **CWE** — categoria técnica da fraqueza (ex.: CWE-22 = Path Traversal); ' +
      'o link leva à definição no MITRE.',
  );
  lines.push(
    '- **Escopo** — `direta`: declarada no seu `package.json` (você controla a ' +
      'versão). `transitiva`: trazida por outra lib (corrija via `overrides`).',
  );
  lines.push(
    '- **Corrigir para** — menor versão que elimina **todas** as CVEs da lib ' +
      'sem trocar de major desnecessariamente.',
  );
  lines.push('');
  lines.push('</details>');
  lines.push('');

  const sevBadge = {
    CRITICAL: '🟣 CRITICAL',
    HIGH: '🔴 HIGH',
    MEDIUM: '🟡 MEDIUM',
    LOW: '🔵 LOW',
    UNKNOWN: '⚪ UNKNOWN',
  };

  for (const t of allTargets) {
    lines.push(`## ${t.label}`);
    lines.push('');
    if (t.findings.length === 0) {
      lines.push('✓ Nenhuma vulnerabilidade conhecida.');
      lines.push('');
      continue;
    }
    lines.push('| Severidade | Lib | Versão atual | Corrigir para | Escopo | CVEs |');
    lines.push('| --- | --- | --- | --- | --- | --- |');
    for (const f of t.findings) {
      lines.push(
        `| ${sevBadge[f.maxSeverity] || f.maxSeverity} | \`${f.name}\` | ${f.installed} | ${
          f.fixed ? `\`${f.fixed}\`` : '_sem correção_'
        } | ${f.direct ? 'direta' : 'transitiva'} | ${f.cves.size} |`,
      );
    }
    lines.push('');
    lines.push('<details><summary>Detalhes por CVE</summary>');
    lines.push('');
    for (const f of t.findings) {
      lines.push(
        `### \`${f.name}@${f.installed}\` — ${f.direct ? 'dependência direta' : 'dependência transitiva'}`,
      );
      lines.push('');
      lines.push(
        `Corrigir para: ${f.fixed ? `**\`${f.fixed}\`**` : '_sem correção disponível_'} · ` +
          `${f.cves.size} CVE(s) · severidade máxima ${sevBadge[f.maxSeverity] || f.maxSeverity}`,
      );
      lines.push('');
      for (const v of f.vulns) {
        const cvss = v.cvss != null ? ` · CVSS ${v.cvss}` : '';
        const link = v.url ? `[${v.id}](${v.url})` : v.id;
        lines.push(`#### ${sevBadge[v.severity] || v.severity}${cvss} — ${link}`);
        lines.push('');
        if (v.title) lines.push(`**${v.title}**`);
        lines.push('');
        const desc = descBlock(v.description, 900);
        if (desc) {
          lines.push(desc);
          lines.push('');
        }
        const meta = [];
        meta.push(`Correção: ${v.fixed ? `\`${v.fixed}\`` : '_sem correção_'}`);
        if (v.cwe.length) meta.push(`Fraqueza: ${v.cwe.map(cweLink).join(', ')}`);
        if (v.published) meta.push(`Publicado: ${v.published}`);
        lines.push(meta.map((m) => `- ${m}`).join('\n'));
        if (v.references && v.references.length) {
          const refs = v.references.slice(0, 5).map((r) => `  - <${r}>`);
          lines.push('- Referências:');
          lines.push(refs.join('\n'));
        }
        lines.push('');
      }
    }
    lines.push('</details>');
    lines.push('');
  }

  // Remediation — the actionable part, also in the document.
  const { any, direct, transitiveByLabel } = computeRemediation(allTargets);
  if (any) {
    lines.push('## Como corrigir (package.json)');
    lines.push('');
    if (direct.length) {
      lines.push('**Dependências diretas — atualize a versão:**');
      lines.push('');
      for (const f of direct) {
        if (f.covered) {
          lines.push(
            `- \`[${f.label}]\` **${f.name}**: a faixa \`"${f.declaredSpec}"\` já permite \`${f.fixed}\` → rode \`cd ${f.label} && npm update ${f.name}\` (ou trave o piso em \`"^${f.fixed}"\`).`,
          );
        } else {
          const from = f.declaredSpec ? `\`"${f.declaredSpec}"\`` : `(instalada \`${f.installed}\`)`;
          lines.push(
            `- \`[${f.label}]\` **${f.name}**: ${from} → \`"^${f.fixed}"\` (altere no \`package.json\` e rode \`npm install\`).`,
          );
        }
      }
      lines.push('');
    }
    if (transitiveByLabel.size) {
      lines.push('**Dependências transitivas — fixe via `overrides`:**');
      lines.push('');
      for (const [label, fs] of transitiveByLabel) {
        const overrides = Object.fromEntries(fs.map((f) => [f.name, `>=${f.fixed}`]));
        lines.push(`No \`${label}/package.json\`:`);
        lines.push('');
        lines.push('```json');
        lines.push(JSON.stringify({ overrides }, null, 2));
        lines.push('```');
        lines.push('');
      }
    }
  }
  return lines.join('\n');
}

function main() {
  const { threshold, detailed, markdown, targets } = parseArgs(
    process.argv.slice(2),
  );
  if (targets.length === 0) {
    console.error('usage: security-report.mjs --threshold HIGH "<label>::<trivy.json>::<package.json>" ...');
    process.exit(2);
  }

  console.log(paint(C.bold, '═══ Security Gate (Trivy) ═══'));
  console.log(
    paint(C.dim, `threshold de bloqueio: ${threshold} ou superior`),
  );

  const allTargets = [];
  let blocking = 0;
  let total = 0;

  for (const t of targets) {
    const declared = loadDeclaredDeps(t.pkgPath);
    const findings = collectFindings(t.trivyPath, declared);
    total += findings.length;
    blocking += findings.filter(
      (f) => sevRank(f.maxSeverity) >= sevRank(threshold),
    ).length;
    allTargets.push({ ...t, findings });
    renderTarget(t.label, findings);
  }

  if (detailed) renderDetailed(allTargets);

  renderRemediation(allTargets);

  if (markdown) {
    try {
      writeFileSync(markdown, buildMarkdown(allTargets, threshold, total, blocking));
      console.log('');
      console.log(paint(C.dim, `relatório detalhado (markdown): ${markdown}`));
    } catch (err) {
      console.error(paint(C.yellow, `aviso: não consegui escrever ${markdown}: ${err.message}`));
    }
  }

  console.log('');
  console.log(paint(C.bold, '─── Resumo ───'));
  console.log(`  vulnerabilidades encontradas: ${total}`);
  console.log(
    `  no/acima do threshold (${threshold}): ${blocking}`,
  );

  if (blocking > 0) {
    console.log('');
    console.log(
      paint(C.red, `✗ Security Gate FALHOU — ${blocking} vulnerabilidade(s) >= ${threshold}`),
    );
    process.exit(1);
  }
  console.log('');
  console.log(paint(C.green, '✓ Security Gate PASSOU'));
  process.exit(0);
}

main();
