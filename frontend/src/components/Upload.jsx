import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import { clsx } from 'clsx';
import { motion } from 'framer-motion';

const Upload = ({ onJobCreated }) => {
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState(null);

    const onDrop = useCallback(async (acceptedFiles) => {
        const file = acceptedFiles[0];
        if (!file) return;

        setUploading(true);
        setError(null);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
            const response = await axios.post(`${apiUrl}/upload`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            onJobCreated(response.data);
        } catch (err) {
            console.error("Upload error:", err);
            if (err.response) {
                // The request was made and the server responded with a status code
                // that falls out of the range of 2xx
                setError(`Upload failed: ${err.response.data.detail || err.response.statusText || "Server Error"}`);
            } else if (err.request) {
                // The request was made but no response was received
                setError("Upload failed: No response from server. Check your connection.");
            } else {
                // Something happened in setting up the request that triggered an Error
                setError(`Upload failed: ${err.message}`);
            }
        } finally {
            setUploading(false);
        }
    }, [onJobCreated]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'text/csv': ['.csv']
        },
        maxFiles: 1
    });

    return (
        <div className="w-full max-w-xl mx-auto mt-6">
            <motion.div
                {...getRootProps()}
                className={clsx(
                    "relative group flex flex-col items-center justify-center w-full h-72 rounded-3xl cursor-pointer transition-all duration-300 overflow-hidden bg-white",
                    isDragActive ? "ring-4 ring-blue-100 scale-[1.02]" : "hover:shadow-lg shadow-sm ring-1 ring-slate-200",
                    uploading ? "opacity-90 pointer-events-none" : ""
                )}
                whileHover={{ y: -4 }}
                whileTap={{ scale: 0.98 }}
            >
                <div className={clsx(
                    "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-blue-50/50 to-cyan-50/50",
                    isDragActive ? "opacity-100" : ""
                )} />

                <div className={clsx(
                    "absolute inset-0 border-2 border-dashed rounded-3xl transition-colors duration-300",
                    isDragActive ? "border-blue-400" : "border-slate-300 group-hover:border-blue-300"
                )} />

                <input {...getInputProps()} disabled={uploading} />

                <div className="relative z-10 flex flex-col items-center justify-center p-8 text-center">
                    <div className={clsx(
                        "p-4 mb-6 rounded-2xl transition-all duration-300 shadow-sm",
                        isDragActive ? "bg-blue-100 text-blue-600 scale-110" : "bg-slate-50 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 group-hover:scale-110"
                    )}>
                        {uploading ? (
                            <svg className="animate-spin h-8 w-8" width="32" height="32" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        ) : (
                            <svg className="w-8 h-8" width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                            </svg>
                        )}
                    </div>

                    {uploading ? (
                        <div className="space-y-2">
                            <h3 className="text-xl font-bold text-slate-700">Uploading...</h3>
                            <p className="text-sm text-slate-500">Please wait while we process your file.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <h3 className="text-xl font-bold text-slate-700 group-hover:text-blue-600 transition-colors">
                                {isDragActive ? "Drop file here" : "Upload your CSV"}
                            </h3>
                            <p className="text-sm text-slate-500 max-w-xs mx-auto">
                                Drag and drop your list here, or <span className="text-blue-500 font-medium border-b border-blue-200">browse files</span>
                            </p>
                            <p className="text-xs text-slate-400 mt-4 font-medium uppercase tracking-wide">
                                Supports .csv up to 10MB
                            </p>
                        </div>
                    )}
                </div>
            </motion.div>
            {error && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 p-4 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100 flex items-center justify-center"
                >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    {error}
                </motion.div>
            )}
        </div>
    );
};

export default Upload;
