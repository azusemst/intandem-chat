"use client";
import Link from "next/link";
export default function ErrorPage({ reset }: { reset: () => void }) { return <section className="panel stack" role="alert"><h1>We couldn’t load that.</h1><p>The service may be temporarily unavailable. Your saved information has not been replaced with sample data. Please retry.</p><button className="button" onClick={reset}>Try again</button><Link href="/login">Sign in again</Link></section>; }
