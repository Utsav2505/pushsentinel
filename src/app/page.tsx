"use client";
import { signIn } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <>
      <div className="w-full h-screen flex justify-center items-center">
        <div className="w-[30%] h-1/4 bg-white/80 rounded-sm  flex justify-center  items-center">
          <button
            className="my-11 rounded-lg text-black  bg-blue-400 w-[90%] text-4xl cursor-pointer py-6"
            onClick={() => {
              signIn("github", { callbackUrl: "/dashboard" });
            }}
          >
            Login
          </button>
        </div>

        <div className="w-full flex justify-center items-center">
          <Link href={"/about"} className="p-4 bg-white text-black texxt-2xl" > GO to about</Link>
        </div>
      </div>
    </>
  );
}
