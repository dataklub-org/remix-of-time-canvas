import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { X, Users } from 'lucide-react';
import { useConnections, Connection } from '@/hooks/useConnections';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface PeopleAutocompleteProps {
  people: string[];
  setPeople: (people: string[]) => void;
  personInput: string;
  setPersonInput: (value: string) => void;
}

export function PeopleAutocomplete({
  people,
  setPeople,
  personInput,
  setPersonInput,
}: PeopleAutocompleteProps) {
  const { user, isAuthenticated } = useAuth();
  const { connections } = useConnections(user?.id || null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter connections based on input
  const filteredConnections = connections.filter((conn) => {
    const query = personInput.toLowerCase();
    const alreadyAdded = people.some(
      (p) => p.toLowerCase() === `@${conn.username}`.toLowerCase()
    );
    if (alreadyAdded) return false;
    if (!query) return true;
    return (
      conn.username.toLowerCase().includes(query) ||
      conn.displayName?.toLowerCase().includes(query)
    );
  });

  const addPerson = (value: string) => {
    const trimmed = value.trim();
    if (trimmed && !people.includes(trimmed)) {
      setPeople([...people, trimmed]);
      setPersonInput('');
      setShowSuggestions(false);
    }
  };

  const addConnection = (connection: Connection) => {
    const username = `@${connection.username}`;
    if (!people.includes(username)) {
      setPeople([...people, username]);
      setPersonInput('');
      setShowSuggestions(false);
    }
  };

  const removePerson = (person: string) => {
    setPeople(people.filter((p) => p !== person));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (personInput.trim()) {
        addPerson(personInput);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const handleInputChange = (value: string) => {
    setPersonInput(value);
    if (isAuthenticated && connections.length > 0) {
      setShowSuggestions(true);
    }
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="space-y-1.5">
      <div className="relative">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            id="people"
            placeholder={isAuthenticated && connections.length > 0 ? "Add from circle or type name..." : "Add person..."}
            value={personInput}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={() => {
              if (isAuthenticated && connections.length > 0) {
                setShowSuggestions(true);
              }
            }}
            onKeyDown={handleKeyDown}
            className="flex-1 h-11 text-base"
            autoComplete="off"
          />
          <button
            type="button"
            onClick={() => personInput.trim() && addPerson(personInput)}
            className="h-11 px-4 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground"
          >
            +
          </button>
        </div>

        {/* Autocomplete dropdown */}
        {showSuggestions && filteredConnections.length > 0 && (
          <div className="absolute z-50 top-full left-0 right-12 mt-1 bg-popover border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
            <div className="p-1.5 border-b border-border">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Users className="h-3 w-3" />
                From your circle
              </p>
            </div>
            {filteredConnections.map((connection) => (
              <button
                key={connection.id}
                type="button"
                onClick={() => addConnection(connection)}
                className="w-full flex items-center gap-2 p-2 hover:bg-muted/50 text-left transition-colors"
              >
                <Avatar className="h-6 w-6">
                  <AvatarImage src={connection.avatarUrl || undefined} />
                  <AvatarFallback className="text-xs">
                    {connection.username[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    @{connection.username}
                  </p>
                  {connection.displayName && (
                    <p className="text-xs text-muted-foreground truncate">
                      {connection.displayName}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selected people badges */}
      {people.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {people.map((person) => {
            const isConnection = person.startsWith('@');
            return (
              <Badge
                key={person}
                variant="secondary"
                className={cn(
                  "gap-1 pr-1 text-sm py-1",
                  isConnection && "bg-primary/10 text-primary border-primary/20"
                )}
              >
                {person}
                <button
                  type="button"
                  onClick={() => removePerson(person)}
                  className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}
