"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerTrigger,
} from "@/components/ui/drawer";

type Heading = {
  id: string;
  text: string;
  level: number;
};

export function TableOfContents() {
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Collect headings
  useEffect(() => {
    const elements = Array.from(
      document.querySelectorAll("h2, h3")
    ) as HTMLHeadingElement[];

    const mapped = elements.map((el) => {
      const id =
        el.id ||
        el.innerText
          .toLowerCase()
          .replace(/[^\w]+/g, "-")
          .replace(/(^-|-$)/g, "");

      el.id = id;

      return {
        id,
        text: el.innerText,
        level: Number(el.tagName.replace("H", "")),
      };
    });

    setHeadings(mapped);
  }, []);

  // Track active section
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      { rootMargin: "0px 0px -70% 0px", threshold: 0.1 }
    );

    headings.forEach((h) => {
      const el = document.getElementById(h.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [headings]);

  if (headings.length === 0) return null;

  const TocList = ({ onClick }: { onClick?: () => void }) => (
    <ul className="space-y-1 text-sm">
      {headings.map((h) => (
        <li
          key={h.id}
          className={cn(
            "rounded-md px-2 py-1 transition",
            activeId === h.id
              ? "bg-muted font-semibold text-foreground"
              : "text-muted-foreground hover:text-foreground",
            h.level === 3 && "ml-3"
          )}
        >
          <a href={`#${h.id}`} onClick={onClick}>
            {h.text}
          </a>
        </li>
      ))}
    </ul>
  );

  return (
    <>
      {/* DESKTOP SIDEBAR */}
      <Card className="sticky top-24 hidden max-h-[80vh] overflow-auto rounded-xl p-4 lg:block">
        <div className="mb-3 text-sm font-semibold text-muted-foreground">
          On this page
        </div>
        <TocList />
      </Card>

      {/* MOBILE DRAWER */}
      <div className="fixed bottom-4 right-4 z-50 lg:hidden">
        <Drawer>
          <DrawerTrigger asChild>
            <Button size="sm" variant="secondary" className="shadow-md">
              On this page
            </Button>
          </DrawerTrigger>

          <DrawerContent className="p-4">
            <div className="mb-2 text-sm font-semibold text-muted-foreground">
              On this page
            </div>
            <TocList />
          </DrawerContent>
        </Drawer>
      </div>
    </>
  );
}
