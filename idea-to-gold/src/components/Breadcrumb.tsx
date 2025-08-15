"use client";

import Link from "next/link";
import type React from "react";

export interface BreadcrumbItem {
  href?: string;
  label: string;
}

interface BreadcrumbProps {
  paths: BreadcrumbItem[];
}

export default function Breadcrumb({ paths }: BreadcrumbProps): React.ReactElement {
  return (
    <nav className="mb-6" aria-label="面包屑导航">
      <ol className="flex items-center space-x-2 text-sm text-gray-500">
        {paths.map((item, index) => (
          <li key={index} className="flex items-center">
            {index > 0 && (
              <span className="mx-2 text-gray-400" aria-hidden="true">
                /
              </span>
            )}
            {item.href ? (
              <Link
                href={item.href}
                className="hover:text-[#2ECC71] hover:underline transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span className="text-gray-700 font-medium" aria-current="page">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}