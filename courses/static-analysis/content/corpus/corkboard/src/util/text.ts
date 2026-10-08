export function summarise(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const space = cut.lastIndexOf(' ');
  return (space > max / 2 ? cut.slice(0, space) : cut) + '…';
}

export function formatDate(timestamp: number): string {
  const d = new Date(timestamp);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function extractTitle(html: string): string {
  const match = /<title>([^<]*)<\/title>/i.exec(html);
  return match ? match[1]!.trim() : '';
}

export function renderMarkup(source: string, allowLinks: boolean, allowImages: boolean): string {
  let out = '';
  for (const line of source.split('\n')) {
    if (line.startsWith('# ')) {
      out += `<h2>${line.slice(2)}</h2>`;
    } else if (line.startsWith('- ')) {
      if (out.endsWith('</li>')) {
        out += `<li>${line.slice(2)}</li>`;
      } else {
        out += `<ul><li>${line.slice(2)}</li>`;
      }
    } else {
      let rendered = line;
      for (const word of line.split(' ')) {
        if (word.startsWith('http')) {
          if (allowLinks && !word.includes('"')) {
            if (allowImages && (word.endsWith('.png') || word.endsWith('.jpg'))) {
              rendered = rendered.replace(word, `<img src="${word}">`);
            } else {
              rendered = rendered.replace(word, `<a href="${word}">${word}</a>`);
            }
          } else if (!allowLinks) {
            rendered = rendered.replace(word, '[link removed]');
          }
        }
      }
      out += rendered.length > 0 ? `<p>${rendered}</p>` : '';
    }
  }
  return out;
}
