"use client";
import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <>
    <div className="w-full flex justify-center items-center">
          <Link href={"/about"} className="p-4 bg-white text-black texxt-2xl" > GO to about</Link>
        </div></>
    
  );
}
