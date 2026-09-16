"use client";
import { catalogCategories } from "../lib/catalog";
import styles from "./catalog-filter.module.css";

export function CatalogFilter({ query, category, onQuery, onCategory }: {
  query: string; category: string; onQuery: (value: string) => void; onCategory: (value: string) => void;
}) {
  return <div className={styles.filters}>
    <input type="search" aria-label="상품명 검색" placeholder="상품명 검색 · 예: 볶음밥" value={query} onChange={e=>onQuery(e.target.value)}/>
    <select aria-label="상품 종류 필터" value={category} onChange={e=>onCategory(e.target.value)}>
      <option value="all">전체 종류</option>
      {Object.entries(catalogCategories).map(([key,label])=><option key={key} value={key}>{label}</option>)}
    </select>
  </div>;
}
