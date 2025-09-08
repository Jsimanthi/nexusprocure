"use client";

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, File as FileIcon, X } from 'lucide-react';
import type { PutBlobResult } from '@vercel/blob';

interface FileUploadProps {
  onUploadComplete: (blobs: PutBlobResult[]) => void;
}

export default function FileUpload({ onUploadComplete }: FileUploadProps) {
  const [uploadedFiles, setUploadedFiles] = useState<PutBlobResult[]>([]);
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      setUploading(true);
      const newBlobs: PutBlobResult[] = [];

      for (const file of acceptedFiles) {
        try {
          const response = await fetch(
            `/api/upload?filename=${encodeURIComponent(file.name)}`,
            {
              method: 'POST',
              body: file,
            }
          );

          if (!response.ok) {
            throw new Error('Upload failed');
          }

          const newBlob = (await response.json()) as PutBlobResult;
          newBlobs.push(newBlob);

        } catch (error) {
          console.error('Error uploading file:', file.name, error);
          // Optionally, handle and display the error to the user
        }
      }

      const updatedFiles = [...uploadedFiles, ...newBlobs];
      setUploadedFiles(updatedFiles);
      onUploadComplete(updatedFiles);
      setUploading(false);
    },
    [uploadedFiles, onUploadComplete]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled: uploading,
  });

  const removeFile = (urlToRemove: string) => {
    // Note: This only removes the file from the local list.
    // Deleting from Vercel Blob would require another API endpoint and call.
    // For this implementation, we assume files are not deleted once uploaded during the form session.
    const updatedFiles = uploadedFiles.filter(file => file.url !== urlToRemove);
    setUploadedFiles(updatedFiles);
    onUploadComplete(updatedFiles);
  };

  return (
    <div>
      <div
        {...getRootProps()}
        className={`mt-1 flex justify-center rounded-md border-2 border-dashed border-gray-300 px-6 pt-5 pb-6 ${
          isDragActive ? 'border-blue-500 bg-blue-50' : ''
        } ${uploading ? 'cursor-not-allowed bg-gray-100' : 'cursor-pointer'}`}
      >
        <div className="space-y-1 text-center">
          <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
          <div className="flex text-sm text-gray-600">
            <label
              htmlFor="file-upload"
              className="relative cursor-pointer rounded-md bg-white font-medium text-blue-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2 hover:text-blue-500"
            >
              <span>Upload files</span>
              <input {...getInputProps()} id="file-upload" name="file-upload" type="file" className="sr-only" />
            </label>
            <p className="pl-1">or drag and drop</p>
          </div>
          <p className="text-xs text-gray-500">Any file type up to 4.5MB</p>
          {uploading && <p className="text-sm text-blue-500">Uploading...</p>}
        </div>
      </div>

      {uploadedFiles.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-gray-700">Attachments</h4>
          <ul className="mt-2 divide-y divide-gray-200 rounded-md border border-gray-200">
            {uploadedFiles.map((file) => (
              <li key={file.url} className="flex items-center justify-between py-3 pl-3 pr-4 text-sm">
                <div className="flex w-0 flex-1 items-center">
                  <FileIcon className="h-5 w-5 flex-shrink-0 text-gray-400" aria-hidden="true" />
                  <span className="ml-2 w-0 flex-1 truncate">{file.pathname}</span>
                </div>
                <div className="ml-4 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => removeFile(file.url)}
                    className="font-medium text-red-600 hover:text-red-500"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
