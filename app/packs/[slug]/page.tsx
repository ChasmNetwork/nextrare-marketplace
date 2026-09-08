"use client";
import { useParams } from "next/navigation";
import { PackTheater } from "@/components/pack-theater";
export default function PackPage() { const { slug } = useParams<{ slug: string }>(); return <PackTheater slug={slug} />; }
