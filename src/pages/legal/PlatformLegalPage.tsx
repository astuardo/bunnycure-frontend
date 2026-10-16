import { ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import terminos from '../../legal/terminos-plataforma.md?raw';
import privacidad from '../../legal/privacidad-plataforma.md?raw';
import encargo from '../../legal/encargo-de-datos.md?raw';

/**
 * Documentos legales de la relación plataforma ↔ salón (distintos de /terminos y /privacidad,
 * que son los del salón con sus clientas). Fuente: src/legal/*.md.
 */
const DOCUMENTS: Record<string, { title: string; markdown: string }> = {
  terminos: { title: 'Términos de servicio', markdown: terminos },
  privacidad: { title: 'Política de privacidad', markdown: privacidad },
  'encargo-de-datos': { title: 'Acuerdo de tratamiento de datos', markdown: encargo },
};

/** Negritas (**texto**) como elementos React, sin HTML crudo. */
const inline = (text: string): ReactNode[] =>
  text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : part
  );

const tableCells = (line: string) => line.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());

/** Subconjunto de Markdown usado en src/legal: títulos, párrafos, listas, citas y tablas. */
function renderMarkdown(markdown: string): ReactNode[] {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const out: ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    if (line.startsWith('# ')) {
      out.push(<h1 key={i} className="text-2xl font-bold text-bunny-cocoa mb-3">{inline(line.slice(2))}</h1>);
      i++;
    } else if (line.startsWith('## ')) {
      out.push(<h2 key={i} className="text-lg font-bold text-bunny-cocoa mt-6 mb-2">{inline(line.slice(3))}</h2>);
      i++;
    } else if (line.startsWith('> ')) {
      out.push(
        <div key={i} className="rounded-xl border border-amber-300 bg-amber-50 text-amber-900 text-sm p-3 my-3">
          {inline(line.slice(2))}
        </div>
      );
      i++;
    } else if (line.startsWith('|')) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].startsWith('|')) {
        if (!/^\|\s*-/.test(lines[i])) rows.push(tableCells(lines[i]));
        i++;
      }
      const [head, ...body] = rows;
      out.push(
        <div key={`t${i}`} className="overflow-x-auto my-3">
          <table className="w-full text-sm border border-bunny-border">
            <thead className="bg-bunny-blush/50">
              <tr>{head.map((c, j) => <th key={j} className="text-left p-2 border-b border-bunny-border">{inline(c)}</th>)}</tr>
            </thead>
            <tbody>
              {body.map((r, k) => (
                <tr key={k} className="border-b border-bunny-border/50">{r.map((c, j) => <td key={j} className="p-2 align-top">{inline(c)}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    } else if (/^(-|\d+\.) /.test(line)) {
      const ordered = /^\d+\. /.test(line);
      const items: string[] = [];
      while (i < lines.length && /^(-|\d+\.) /.test(lines[i])) {
        items.push(lines[i].replace(/^(-|\d+\.) /, ''));
        i++;
      }
      const ListTag = ordered ? 'ol' : 'ul';
      out.push(
        <ListTag key={`l${i}`} className={`${ordered ? 'list-decimal' : 'list-disc'} pl-6 space-y-1 text-sm text-bunny-cocoa my-2`}>
          {items.map((it, k) => <li key={k}>{inline(it)}</li>)}
        </ListTag>
      );
    } else {
      out.push(<p key={i} className="text-sm text-bunny-cocoa leading-relaxed my-2">{inline(line)}</p>);
      i++;
    }
  }
  return out;
}

export default function PlatformLegalPage() {
  const { document } = useParams<{ document: string }>();
  const doc = document ? DOCUMENTS[document] : undefined;

  return (
    <div className="min-h-screen bg-bunny-paper p-4">
      <article className="max-w-3xl mx-auto bg-white rounded-2xl border border-bunny-border p-6">
        {doc ? renderMarkdown(doc.markdown) : <p className="text-sm">Documento no encontrado.</p>}
        <nav className="mt-8 pt-4 border-t border-bunny-border flex flex-wrap gap-4 text-xs">
          {Object.entries(DOCUMENTS).map(([slug, d]) => (
            <Link key={slug} to={`/plataforma/${slug}`} className="underline text-bunny-cocoa">{d.title}</Link>
          ))}
          <Link to="/registro" className="underline text-bunny-cocoa">Crear mi salón</Link>
        </nav>
      </article>
    </div>
  );
}
