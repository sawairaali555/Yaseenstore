import { useRef } from 'react';
import { ChevronRight } from 'lucide-react';

function categoryPath(nodes, name, parents = []) {
  for (const node of nodes) {
    if (!node.enabled) continue;
    const path = [...parents, node];
    if (node.name === name) return path;
    const found = categoryPath(node.children || [], name, path);
    if (found) return found;
  }
  return null;
}

export default function CategoryTabs({categories, categoryTree = [], active, onChange}) {
  const row = useRef(null);
  const selectedPath = categoryPath(categoryTree, active) || [];
  const root = selectedPath[0];
  return <section id="market-category-browser" className="market-categories" aria-labelledby="market-interests">
    <div className="market-section-heading"><div><span className="market-eyebrow">A LITTLE SOMETHING FOR EVERYONE</span><h2 id="market-interests">Explore Your Interests</h2></div><span className="market-category-note">Find the things that feel like you.</span></div>
    <div className="market-category-row">
      <div className="market-pills" ref={row} role="group" aria-label="Filter by category">{categories.map(category => {
        const selected = category === (root?.name || active);
        return <button key={category} aria-pressed={selected} className={selected ? 'is-active' : ''} onClick={() => onChange(category)}>{category}</button>;
      })}</div>
      <button className="market-carousel-arrow" aria-label="Scroll categories right" onClick={() => row.current?.scrollBy({left:260,behavior:'smooth'})}><ChevronRight size={18}/></button>
    </div>
  </section>;
}
