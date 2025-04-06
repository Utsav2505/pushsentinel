"use client";
import FileInp from "@/components/ui/FileInp";
import axios from "axios";
// import Link from "next/link";
import React, { useState } from "react";

export default function Page() {
  const [text, settext] = useState<string>("");
  const [img, setimg] = useState<File | null>(null);
  const [out, setout] = useState<string>("image");
  const send = async () => {
    try {
      if (text !== "" && img !== null) {
        alert("ONLY ONE INPUT REQUIRED !!");
      } else if (text !== "") {
        const resp = await axios.post("/text-inp", { prompt: text, type: out });
        if (resp.data.success) {
          alert("done");
        } else {
          alert("not done");
        }
      } else if (img !== null) {
        const formdata = new FormData();
        formdata.append("image", img as File);
        formdata.append("type", out);
        const resp = await axios.post("/img-inp", formdata);
        if (resp.data.succedd) {
          alert("done");
        } else {
          alert("not done");
        }
      }
    } catch (e) {
      console.log(e);
      alert("service unable");
    }
  };

  return (
    <>
      <div className="relative h-screen w-screen">
        <div className="inset-0 w-full h-screen bg-gradient-to-br from-purple-500 to-transparent blur-md -z-10 clip-diagonal2" />
      </div>

      <div className="fixed bottom-0 w-full h-screen  z-20 flex flex-col justify-center items-center overflow-hidden  overflow-y-hidden overflow-x-auto ">
        <div className="sm:w-[80%] w-[90%]  flex-col h-[80%] sm:mt-0 mt-20 aaa1 flex justify-center items-center">
          <div className="flex sm:flex-row flex-col w-full h-[80%] justify-center items-center">
            <div className="sm:h-[80%] h-[50%] sm:w-[40%] w-[95%] flex flex-col justify-center items-center ">
              <textarea
                onChange={(e) => settext(e.target.value)}
                placeholder="Enter Your Prompt..."
                className="h-full w-full rounded-xl p-5   aaa2 text-lg focus:outline-none resize-none"
              />
            </div>
            <div className=" sm:h-[80%] h-[45%] sm:w-[40%] w-full flex sm:flex-col flex-row justify-center items-center ">
              <div className="sm:w-full w-[50%] sm:h-[50%] h-full flex flex-col justify-center items-center">
                <div className="sm:text-5xl text-2xl  font-semibold">OR</div>
                <div className="sm:text-2xl text-lg mb-3">Upload A Image</div>
              </div>
              <div className="sm:w-full w-[50%] sm:h-[50%] h-full flex justify-center items-center">
                <FileInp imgfile={setimg} />
              </div>
            </div>
          </div>
          <div className="h-[10%] w-full flex justify-center items-center">
            <div className="flex aaa1 space-x-2 border-[3px] border-purple-400 rounded-xl select-none">
              <label className="radio flex flex-grow items-center justify-center rounded-lg p-1 cursor-pointer">
                <input
                  type="radio"
                  name="radio"
                  value="html"
                  onChange={() => setout("image")}
                  className="peer hidden"
                  checked={out === "image" ? true : false}
                />
                <span className="tracking-widest peer-checked:bg-gradient-to-r peer-checked:from-[blueviolet] peer-checked:to-[violet] peer-checked:text-white text-white  p-2 rounded-lg transition duration-150 ease-in-out">
                  Image
                </span>
              </label>

              <label className="radio flex flex-grow items-center justify-center rounded-lg p-1 cursor-pointer">
                <input
                  type="radio"
                  name="radio"
                  onChange={() => setout("3d")}
                  value="react"
                  className="peer hidden"
                />
                <span className="tracking-widest peer-checked:bg-gradient-to-r peer-checked:from-[blueviolet] peer-checked:to-[violet] peer-checked:text-white text-white p-2 rounded-lg transition duration-150 ease-in-out">
                  Gif
                </span>
              </label>

              <label className="radio flex flex-grow items-center justify-center rounded-lg p-1 cursor-pointer">
                <input
                  type="radio"
                  name="radio"
                  value="vue"
                  onChange={() => setout("3d")}
                  className="peer hidden"
                />
                <span className="tracking-widest peer-checked:bg-gradient-to-r peer-checked:from-[blueviolet] peer-checked:to-[violet] peer-checked:text-white text-white p-2 rounded-lg transition duration-150 ease-in-out">
                  3D Model
                </span>
              </label>
            </div>
          </div>
        </div>

        <button
          onClick={() => send()}
          className="overflow-hidden mt-3  w-32 p-2 h-12 bg-black text-white border-none rounded-md text-xl font-bold cursor-pointer relative group"
        >
          Submit !
          <span className="absolute w-36 h-32 -top-8 -left-2 bg-white rotate-12 transform scale-x-0 group-hover:scale-x-100 transition-transform group-hover:duration-500 duration-1000 origin-left"></span>
          <span className="absolute w-36 h-32 -top-8 -left-2 bg-purple-400 rotate-12 transform scale-x-0 group-hover:scale-x-100 transition-transform group-hover:duration-700 duration-700 origin-left"></span>
          <span className="absolute w-36 h-32 -top-8 -left-2 bg-purple-600 rotate-12 transform scale-x-0 group-hover:scale-x-100 transition-transform group-hover:duration-1000 duration-500 origin-left"></span>
          <span className="group-hover:opacity-100 group-hover:duration-1000 duration-100 opacity-0 absolute top-2.5 left-6 z-10">
            Lets Go!
          </span>
        </button>
      </div>
    </>
  );
}
