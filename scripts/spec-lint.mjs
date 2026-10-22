#!/usr/bin/env node
// spec-lint: validador del SDD CodeTlon (sdd: v1). Node puro, sin dependencias.
// Uso: node scripts/spec-lint.mjs [--root .] [--profile S1|S2|S3|M|L7|Retrofit] [--drift <base-git>] [--json]
// Sale con 1 si hay errores. En perfil S1 la trazabilidad y el drift son avisos (advisory).
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const VERIFY_TYPES = ['e2e', 'unit', 'contract', 'eval', 'manual'];
export const CONFIDENCE = ['confirmado', 'inferido', 'gap'];
export const MAX_SPEC_LINES = 150;
export const MAX_DELTA_LINES = 80;
const STRICT_PROFILES = ['S2', 'S3', 'M', 'L7', 'Retrofit'];
const VAGUE = /\b(r[aá]pid[oa]s?|amigable|intuitiv[oa]s?|f[aá]cil(?:es)?|moderno|escalable|robust[oa]|user[- ]friendly|fast)\b/i;
const RFC = /\b(NO DEBE|DEBER[IÍ]A|DEBE|PUEDE)\b/;
const REQ_HEAD = /^(#{2,4})\s+(REQ-([A-Z][A-Z0-9]*)-(\d{3}))\b(.*)$/;

export function parseFrontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n/);
  const meta = {};
  if (!m) return { meta, body: text, offset: 0 };
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^([\wáéíóú-]+):\s*(.*)$/);
    if (kv) meta[kv[1]] = kv[2].trim();
  }
  return { meta, body: text.slice(m[0].length), offset: m[0].split('\n').length - 1 };
}

// Devuelve los requisitos de un texto con su bloque y línea de inicio (1-based).
export function parseRequirements(text) {
  const { body, offset } = parseFrontmatter(text);
  const lines = body.split('\n');
  const reqs = [];
  let section = null;
  for (let i = 0; i < lines.length; i++) {
    const sec = lines[i].match(/^##\s+(ADDED|MODIFIED|REMOVED)\b/);
    if (sec) section = sec[1];
    const h = lines[i].match(REQ_HEAD);
    if (!h) continue;
    const level = h[1].length;
    let end = i + 1;
    while (end < lines.length) {
      const next = lines[end].match(/^(#{1,6})\s/);
      if (next && next[1].length <= level) break;
      end++;
    }
    reqs.push({ id: h[2], cap: h[3], line: i + 1 + offset, section, head: h[5], block: lines.slice(i + 1, end).join('\n') });
  }
  return reqs;
}

export function lintRequirement(req) {
  const issues = [];
  const at = (msg) => issues.push({ line: req.line, level: 'error', msg: `${req.id}: ${msg}` });
  const text = `${req.head}\n${req.block}`.replace(/REQ-[A-Z0-9]+-\d{3}/g, '').replace(/MANUAL-PRUEBAS\.md#?/g, '');
  if (!RFC.test(req.block)) at('falta palabra RFC 2119 (DEBE / NO DEBE / DEBERÍA / PUEDE)');
  if (!/Dado\b/.test(req.block) || !/Cuando\b/.test(req.block) || !/Entonces\b/.test(req.block)) {
    at('falta escenario Dado/Cuando/Entonces');
  }
  const vague = text.match(VAGUE);
  if (vague && !/\d/.test(text)) at(`término vago "${vague[0]}" sin métrica numérica`);
  const v = req.block.match(/^\s*-\s*verify:\s*(\S+)(?:\s+(\S+))?\s*$/m);
  if (!v) at('falta "- verify: <tipo> <referencia>"');
  else {
    if (!VERIFY_TYPES.includes(v[1])) at(`verify "${v[1]}" inválido (${VERIFY_TYPES.join('|')})`);
    else if (!v[2]) at('verify sin referencia (archivo de test o ítem de MANUAL-PRUEBAS.md)');
  }
  const c = req.block.match(/^\s*-\s*confianza:\s*(\S+)\s*$/m);
  if (c && !CONFIDENCE.includes(c[1])) at(`confianza "${c[1]}" inválida (${CONFIDENCE.join('|')})`);
  return { issues, verify: v ? { type: v[1], ref: v[2] } : null };
}

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    statSync(p).isDirectory() ? walk(p, out) : out.push(p);
  }
  return out;
}

export function discover(root) {
  const specsDir = join(root, 'specs');
  const specs = [];
  const deltas = [];
  if (!existsSync(specsDir)) return { specs, deltas, exists: false };
  for (const name of readdirSync(specsDir)) {
    const p = join(specsDir, name);
    if (!statSync(p).isDirectory() || name === 'changes' || name === '_archive') continue;
    if (existsSync(join(p, 'spec.md'))) specs.push(join(p, 'spec.md'));
  }
  const changes = join(specsDir, 'changes');
  if (existsSync(changes)) {
    for (const name of readdirSync(changes)) {
      if (existsSync(join(changes, name, 'delta.md'))) deltas.push(join(changes, name, 'delta.md'));
    }
  }
  return { specs, deltas, exists: true };
}

// Prefijos de rutas que cubre cada spec (frontmatter "rutas: src/a, src/b").
export function checkDrift(changedFiles, specInfos, hasDelta) {
  if (hasDelta) return [];
  const hits = [];
  for (const s of specInfos) {
    const touched = changedFiles.filter((f) => s.rutas.some((r) => f.startsWith(r)));
    if (touched.length) hits.push({ cap: s.cap, files: touched });
  }
  return hits;
}

export function lintTree(root, opts = {}) {
  const profile = opts.profile ?? readProfile(root) ?? 'S1';
  const strict = STRICT_PROFILES.includes(profile);
  const results = [];
  const push = (file, line, level, msg) => results.push({ file: relative(root, file) || file, line, level, msg });
  const soft = strict ? 'error' : 'warn';
  const { specs, deltas, exists } = discover(root);

  if (!exists || (specs.length === 0 && deltas.length === 0)) {
    if (strict) push(join(root, 'specs'), 0, 'error', `perfil ${profile} exige specs/ con al menos una capacidad`);
    return { profile, results, specIds: new Set(), ok: !results.some((r) => r.level === 'error') };
  }

  const specIds = new Map();
  const manual = existsSync(join(root, 'MANUAL-PRUEBAS.md')) ? readFileSync(join(root, 'MANUAL-PRUEBAS.md'), 'utf8') : '';
  const specInfos = [];

  const lintFile = (file, kind) => {
    const text = readFileSync(file, 'utf8');
    const lineCount = text.split('\n').length;
    const max = kind === 'delta' ? MAX_DELTA_LINES : MAX_SPEC_LINES;
    if (lineCount > max) push(file, 0, 'error', `${lineCount} líneas, tope ${max} (partir la capacidad)`);
    const { meta } = parseFrontmatter(text);
    const reqs = parseRequirements(text);
    if (kind === 'spec' && reqs.length === 0) push(file, 0, 'error', 'no define ningún REQ-<CAP>-NNN');
    if (kind === 'spec') {
      specInfos.push({ cap: meta.capacidad ?? '', rutas: (meta.rutas ?? '').split(',').map((s) => s.trim()).filter(Boolean) });
    }
    for (const req of reqs) {
      if (meta.capacidad && req.cap !== meta.capacidad) {
        push(file, req.line, 'error', `${req.id}: la capacidad del ID no coincide con "capacidad: ${meta.capacidad}"`);
      }
      if (kind === 'delta' && req.section === 'REMOVED') continue;
      const { issues, verify } = lintRequirement(req);
      for (const i of issues) push(file, i.line, i.level, i.msg);
      if (kind === 'spec') {
        if (specIds.has(req.id)) push(file, req.line, 'error', `${req.id}: ID duplicado (ya en ${specIds.get(req.id)})`);
        else specIds.set(req.id, relative(root, file));
      }
      if (verify && VERIFY_TYPES.includes(verify.type) && verify.ref) {
        if (verify.type === 'manual') {
          if (!manual.includes(req.id)) push(file, req.line, soft, `${req.id}: verify manual sin ítem en MANUAL-PRUEBAS.md que mencione el ID`);
        } else {
          const refFile = verify.ref.split('#')[0];
          const p = join(root, refFile);
          if (relative(root, p).startsWith('..')) push(file, req.line, 'error', `${req.id}: ruta de test fuera del workspace ("${refFile}")`);
          else if (!existsSync(p)) push(file, req.line, soft, `${req.id}: el test "${refFile}" no existe`);
          else if (!readFileSync(p, 'utf8').includes(req.id)) push(file, req.line, soft, `${req.id}: "${refFile}" no referencia el ID (tag del test)`);
        }
      }
    }
    return { reqs, text };
  };

  for (const f of specs) lintFile(f, 'spec');
  for (const f of deltas) {
    const { reqs, text } = lintFile(f, 'delta');
    const removed = [...text.matchAll(/^\s*-\s*(REQ-[A-Z][A-Z0-9]*-\d{3})/gm)].map((m) => m[1]);
    for (const r of reqs) {
      if (r.section === 'ADDED' && specIds.has(r.id)) push(f, r.line, 'error', `${r.id}: está en ADDED pero ya existe en ${specIds.get(r.id)}`);
      if (r.section === 'MODIFIED' && !specIds.has(r.id)) push(f, r.line, 'error', `${r.id}: está en MODIFIED pero no existe en ninguna spec`);
    }
    for (const id of removed) {
      if (!specIds.has(id)) push(f, 0, 'error', `${id}: está en REMOVED pero no existe en ninguna spec`);
    }
  }

  if (opts.changedFiles) {
    const hits = checkDrift(opts.changedFiles, specInfos, deltas.length > 0);
    for (const h of hits) push(join(root, 'specs'), 0, soft, `drift: el diff toca la capacidad ${h.cap} (${h.files.slice(0, 3).join(', ')}) sin delta en specs/changes/`);
  }

  return { profile, results, specIds, ok: !results.some((r) => r.level === 'error') };
}

function readProfile(root) {
  const p = join(root, 'specs', 'README.md');
  if (!existsSync(p)) return null;
  const m = parseFrontmatter(readFileSync(p, 'utf8')).meta.perfil;
  return m || null;
}

function main(argv) {
  const arg = (name) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : undefined; };
  const root = arg('--root') ?? process.cwd();
  let changedFiles;
  const base = arg('--drift');
  if (base) {
    if (!/^[\w.\/-]+$/.test(base) || base.startsWith('-')) { console.error('--drift: referencia git invalida'); process.exit(2); }
    changedFiles = execFileSync('git', ['diff', '--name-only', `${base}...HEAD`], { cwd: root, encoding: 'utf8' }).split('\n').filter(Boolean);
  }
  const out = lintTree(root, { profile: arg('--profile'), changedFiles });
  if (argv.includes('--json')) console.log(JSON.stringify({ profile: out.profile, ok: out.ok, results: out.results }, null, 2));
  else {
    for (const r of out.results) console.log(`${r.level.toUpperCase()} ${r.file}${r.line ? `:${r.line}` : ''} ${r.msg}`);
    const e = out.results.filter((r) => r.level === 'error').length;
    console.log(`spec-lint (perfil ${out.profile}): ${out.specIds.size} REQ, ${e} errores, ${out.results.length - e} avisos`);
  }
  process.exit(out.ok ? 0 : 1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main(process.argv.slice(2));
