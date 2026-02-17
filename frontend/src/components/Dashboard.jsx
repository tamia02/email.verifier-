import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';

const Dashboard = ({ jobId, onReset }) => {
    const [job, setJob] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let interval;
        const fetchJob = async () => {
            try {
                const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
                const res = await axios.get(`${apiUrl}/job/${jobId}`);
                setJob(res.data);
                if (res.data.status === 'COMPLETED' || res.data.status === 'FAILED' || res.data.status === 'CANCELLED') {
                    clearInterval(interval);
                }
            } catch (err) {
                console.error("Error fetching job", err);
            } finally {
                setLoading(false);
            }
        };

        fetchJob();
        interval = setInterval(fetchJob, 2000); // Poll every 2s

        return () => clearInterval(interval);
    }, [jobId]);

    if (loading && !job) return <div className="text-center mt-10">Loading job status...</div>;
    if (!job) return <div className="text-center mt-10 text-red-500">Job not found</div>;

    const progress = job.total_emails > 0 ? (job.processed_emails / job.total_emails) * 100 : 0;

    const downloadUrl = (type) => {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        return `${apiUrl}/job/${jobId}/download/${type}`;
    };

    return (
        <div className="w-full max-w-4xl mx-auto mt-6">
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Processing Job</h2>
                    <p className="text-slate-500 text-sm mt-1">Job ID: <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-600">{jobId.split('-')[0]}...</span></p>
                </div>
                <button
                    onClick={onReset}
                    className="text-sm font-medium text-blue-600 hover:text-blue-700 bg-blue-50 px-4 py-2 rounded-lg hover:bg-blue-100 transition-colors"
                >
                    Start New Job
                </button>
            </div>

            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 mb-8">
                <div className="flex justify-between mb-4">
                    <span className="font-semibold text-slate-700 flex items-center gap-2">
                        Status:
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${job.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                            job.status === 'FAILED' ? 'bg-red-100 text-red-800' :
                                'bg-blue-100 text-blue-800'
                            }`}>
                            {job.status === 'PROCESSING' && <span className="w-2 h-2 mr-1.5 bg-blue-400 rounded-full animate-pulse"></span>}
                            {job.status}
                        </span>
                    </span>
                    <span className="text-slate-600 font-medium tabular-nums">
                        {job.total_emails > 0 ? (
                            <>
                                {Math.floor(progress)}%
                                <span className="text-slate-400 text-sm ml-2 font-normal">({job.processed_emails} / {job.total_emails})</span>
                            </>
                        ) : (
                            <span className="text-blue-500 animate-pulse">Analyzing file structure...</span>
                        )}
                    </span>
                </div>

                <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                    <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.5 }}
                    />
                </div>
            </div>

            {job.status === 'COMPLETED' && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-8"
                >
                    <div className="flex justify-center">
                        <a
                            href={downloadUrl('cleaned')}
                            download={`cleaned_${job.filename}`}
                            className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white transition-all duration-200 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 hover:from-green-600 hover:to-emerald-700 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                        >
                            <svg className="w-6 h-6 mr-3 -ml-1 text-green-100" width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            Download Cleaned List
                            <span className="absolute -top-2 -right-2 flex h-5 w-5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-5 w-5 bg-green-500"></span>
                            </span>
                        </a>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <DownloadCard
                            title="Valid Emails"
                            count="Safe"
                            icon={<svg className="w-6 h-6" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>}
                            color="bg-white border-green-200 text-green-600 hover:border-green-300 hover:shadow-green-50/50"
                            url={downloadUrl('valid')}
                        />
                        <DownloadCard
                            title="Invalid"
                            count="Bounced"
                            icon={<svg className="w-6 h-6" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>}
                            color="bg-white border-red-200 text-red-600 hover:border-red-300 hover:shadow-red-50/50"
                            url={downloadUrl('invalid')}
                        />
                        <DownloadCard
                            title="Catch-All"
                            count="Accept All"
                            icon={<svg className="w-6 h-6" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>}
                            color="bg-white border-yellow-200 text-yellow-600 hover:border-yellow-300 hover:shadow-yellow-50/50"
                            url={downloadUrl('catch_all')}
                        />
                        <DownloadCard
                            title="Risky / Unknown"
                            count="Verify Later"
                            icon={<svg className="w-6 h-6" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
                            color="bg-white border-orange-200 text-orange-600 hover:border-orange-300 hover:shadow-orange-50/50"
                            url={downloadUrl('risky')}
                        />
                    </div>

                    <div className="text-center pt-4">
                        <a href={downloadUrl('all')} className="text-sm text-slate-400 hover:text-blue-600 transition-colors flex items-center justify-center gap-2">
                            <svg className="w-4 h-4" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            Download full raw results
                        </a>
                    </div>
                </motion.div>
            )}
        </div>
    );
};

const DownloadCard = ({ title, count, icon, color, url }) => (
    <a
        href={url}
        download
        className={`flex flex-col items-center justify-center p-6 border-2 rounded-2xl transition-all duration-200 hover:-translate-y-1 hover:shadow-lg ${color}`}
    >
        <div className="mb-3 p-3 rounded-xl bg-current bg-opacity-10">
            {icon}
        </div>
        <h3 className="font-bold text-lg text-slate-700">{title}</h3>
        <p className="text-sm opacity-80 font-medium">{count}</p>
    </a>
);
export default Dashboard;
