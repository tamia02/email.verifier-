import React, { useState } from 'react';
import Upload from './components/Upload';
import Dashboard from './components/Dashboard';

function App() {
  const [currentJob, setCurrentJob] = useState(null);

  const handleJobCreated = (job) => {
    setCurrentJob(job.id);
  };

  const handleReset = () => {
    setCurrentJob(null);
  };

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 font-sans text-slate-100 flex flex-col items-center justify-center relative overflow-hidden">

      {/* Background Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-purple-600/30 blur-[100px] animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/30 blur-[100px] animate-pulse"></div>

      <div className="max-w-6xl w-full z-10">
        <header className="text-center mb-12">
          <div className="inline-block mb-4 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-medium tracking-wider uppercase text-blue-300 backdrop-blur-md">
            Enterprise Grade Verification
          </div>
          <h1 className="text-6xl md:text-7xl font-extrabold tracking-tight mb-6">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-400 animate-gradient-x">
              Email Verifier Pro
            </span>
          </h1>
          <p className="max-w-2xl mx-auto text-xl text-slate-300 font-light leading-relaxed">
            Clean your email lists with AI-powered accuracy. <br />
            <span className="text-slate-400">Detect disposables, spam traps, and invalid domains instantly.</span>
          </p>
        </header>

        <main className="relative">
          {/* Main Glass Card */}
          <div className="bg-slate-900/40 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl border border-white/10 p-8 md:p-12 overflow-hidden relative">

            {/* Inner Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-1 bg-gradient-to-r from-transparent via-blue-500/50 to-transparent blur-sm"></div>

            {!currentJob ? (
              <Upload onJobCreated={handleJobCreated} />
            ) : (
              <Dashboard jobId={currentJob} onReset={handleReset} />
            )}
          </div>
        </main>

        <footer className="mt-16 text-center text-slate-500 text-sm font-medium">
          &copy; {new Date().getFullYear()} Email Verifier Pro. All rights reserved.
        </footer>
      </div>
    </div>
  );
}

export default App;
