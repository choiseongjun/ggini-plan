import Link from "next/link";
import { guides } from "../../lib/guides";
import { pageMetadata } from "../../lib/seo";
export const metadata = pageMetadata("자취 식단·식비 절약·장보기 가이드 | 끼니플랜", "혼자 사는 일주일을 위한 식비 예산, 1인 가구 장보기 리스트, 간단한 식단표 만들기 가이드.", "/guides");
export default function Guides() { return <><p className="guide-kicker">혼자 사는 일주일을 위해</p><h1>자취 식생활 가이드</h1><p className="guide-lead">얼마를 쓰고, 무엇을 사고, 어떻게 먹을지.<br/>처음 자취를 시작해도 하나씩 계획할 수 있어요.</p><div className="guide-list">{guides.map((g,i)=><Link key={g.slug} href={"/guides/"+g.slug}><small>0{i+1}</small><h2>{g.title}</h2><p>{g.description}</p><span>읽어보기 →</span></Link>)}</div></>; }
