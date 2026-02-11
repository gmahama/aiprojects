"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Search, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { getClassificationColor } from "@/lib/utils";
import type { Contact, PaginatedResponse } from "@/types";

export default function ContactsPage() {
  const { getToken } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const pageSize = 25;

  useEffect(() => {
    async function fetchContacts() {
      setIsLoading(true);
      try {
        const token = await getToken();
        const params: Record<string, string> = {
          page: page.toString(),
          page_size: pageSize.toString(),
        };
        if (search) {
          params.search = search;
        }
        const res = (await api.getContacts(token, params)) as PaginatedResponse<Contact>;
        setContacts(res.items);
        setTotal(res.total);
      } catch (error) {
        console.error("Failed to fetch contacts:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchContacts();
  }, [getToken, page, search]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
          <p className="text-muted-foreground">{total} contacts total</p>
        </div>
        <Link href="/contacts/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Contact
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search contacts..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="pl-10"
        />
      </div>

      {/* Contacts List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : contacts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No contacts found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {contacts.map((contact) => (
            <Link key={contact.id} href={`/contacts/${contact.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                        <span className="text-primary-600 font-semibold">
                          {contact.first_name[0]}
                          {contact.last_name[0]}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-semibold">
                          {contact.first_name} {contact.last_name}
                        </h3>
                        {contact.title && (
                          <p className="text-sm text-muted-foreground">
                            {contact.title}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {contact.organization && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Building2 className="h-4 w-4" />
                          {contact.organization.name}
                        </div>
                      )}
                      <Badge
                        className={getClassificationColor(contact.classification)}
                        variant="secondary"
                      >
                        {contact.classification}
                      </Badge>
                    </div>
                  </div>
                  {contact.email && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      {contact.email}
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
