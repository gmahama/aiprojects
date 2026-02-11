"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Search as SearchIcon, Users, Building2, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import type { SearchResult } from "@/types";

function SearchPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { getToken } = useAuth();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    const q = searchParams.get("q");
    if (q) {
      setQuery(q);
      performSearch(q);
    }
  }, [searchParams]);

  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    setHasSearched(true);
    try {
      const token = await getToken();
      const res = await api.search(token, { q: searchQuery });
      setResults(res.items);
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query)}`);
    }
  };

  const getEntityIcon = (type: string) => {
    switch (type) {
      case "contact":
        return <Users className="h-5 w-5" />;
      case "organization":
        return <Building2 className="h-5 w-5" />;
      case "activity":
        return <Calendar className="h-5 w-5" />;
      default:
        return null;
    }
  };

  const getEntityLink = (result: SearchResult) => {
    switch (result.entity_type) {
      case "contact":
        return `/contacts/${result.entity_id}`;
      case "organization":
        return `/organizations/${result.entity_id}`;
      case "activity":
        return `/activities/${result.entity_id}`;
      default:
        return "#";
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Form */}
      <form onSubmit={handleSearch} className="max-w-2xl">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search contacts, organizations, activities..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10 h-12 text-lg"
          />
        </div>
      </form>

      {/* Results */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : hasSearched ? (
        results.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <SearchIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                No results found for &quot;{searchParams.get("q")}&quot;
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Found {results.length} results for &quot;{searchParams.get("q")}&quot;
            </p>

            {results.map((result) => (
              <Link key={result.entity_id} href={getEntityLink(result)}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="p-2 bg-gray-100 rounded-lg text-muted-foreground">
                        {getEntityIcon(result.entity_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="capitalize">
                            {result.entity_type}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            Relevance: {Math.round(result.relevance_score * 100)}%
                          </span>
                        </div>
                        <h3 className="font-semibold mt-1">{result.title}</h3>
                        {result.snippet && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {result.snippet}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <SearchIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Search Constellation AI</p>
            <p className="text-muted-foreground mt-1">
              Find contacts, organizations, and activities
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <SearchPageContent />
    </Suspense>
  );
}
