
import "@/app/globals.css";
import Front from "@/components/Front";
export default function Home() {
  return (
    <>
      <div className="relative h-screen w-screen">
        {/* Background layer */}
        <div className="inset-0 w-full h-screen bg-gradient-to-br from-blue-500 to-transparent blur-md -z-10 clip-diagonal" />
      </div>
      {/* Content */}
      <div className="fixed bottom-0 w-full h-screen  z-20 flex flex-col overflow-hidden  overflow-y-hidden overflow-x-auto ">
      <Front/>
        

      </div>
    </>
  );
}
