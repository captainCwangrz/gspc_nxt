import { useMemo, useState, type KeyboardEvent } from 'react';
import { useGraphStore } from '../stores/useGraphStore';

interface SearchBarProps {
  onFocusNode: (nodeId: number) => void;
}

export const SearchBar = ({ onFocusNode }: SearchBarProps) => {
  const nodes = useGraphStore((state) => state.nodes);
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) {
      return [];
    }
    return nodes
      .filter((node) => {
        const idMatch = String(node.id).includes(trimmed);
        const usernameMatch = node.username.toLowerCase().includes(trimmed);
        const nameMatch = node.name.toLowerCase().includes(trimmed);
        return idMatch || usernameMatch || nameMatch;
      })
      .slice(0, 6);
  }, [nodes, query]);

  const handleSelect = (nodeId: number) => {
    onFocusNode(nodeId);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && results.length > 0) {
      handleSelect(results[0].id);
    }
  };

  return (
    <aside className="search-hud">
      <div className="search-input">
        <span>🔭</span>
        <input
          type="search"
          placeholder="Search by name, @username, or ID"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={handleKeyDown}
        />
      </div>
      {query.trim().length > 0 ? (
        <div className="search-results">
          {results.length > 0 ? (
            results.map((node) => (
              <button
                key={node.id}
                type="button"
                onClick={() => handleSelect(node.id)}
              >
                <img src={node.avatar} alt="" />
                <div>
                  <strong>{node.name}</strong>
                  <span>@{node.username} · ID {node.id}</span>
                </div>
              </button>
            ))
          ) : (
            <div className="search-empty">No matches found.</div>
          )}
        </div>
      ) : null}
    </aside>
  );
};
