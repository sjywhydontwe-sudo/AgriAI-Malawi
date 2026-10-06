"use client";
import Link from "next/link";
import { Icon } from "./ui";

export default function NotFound() {
  return (
    <section className="view active">
      <div className="scroll">
        <div className="empty"><Icon name="history" size={48} /><div>This estimate isn&apos;t saved on this phone.<br /><Link href="/">Go home</Link></div></div>
      </div>
    </section>
  );
}
