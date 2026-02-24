/**
 * DOM Import Zone - accepts PNG + JSON files
 */

'use client';

import React, { useCallback, useState } from 'react';

export interface DOMImportZoneProps {
  onFilesSelect: (pngFile: File, jsonFile: File) => void;
  disabled?: boolean;
}

export function DOMImportZone({ onFilesSelect, disabled }: DOMImportZoneProps) {
  const [pngFile, setPngFile] = useState<File | null>(null);
  const [jsonFile, setJsonFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const validateAndSetFiles = useCallback(
    (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      let png: File | null = null;
      let json: File | null = null;

      for (const file of fileArray) {
        if (file.type === 'image/png' || file.name.endsWith('.png')) {
          png = file;
        } else if (
          file.type === 'application/json' ||
          file.name.endsWith('.json')
        ) {
          json = file;
        }
      }

      if (png) setPngFile(png);
      if (json) setJsonFile(json);

      // Auto-submit if both files present
      if (png && json && onFilesSelect) {
        onFilesSelect(png, json);
      }
    },
    [onFilesSelect]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (disabled) return;

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        validateAndSetFiles(e.dataTransfer.files);
      }
    },
    [disabled, validateAndSetFiles]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>, fileType: 'png' | 'json') => {
      if (!e.target.files || e.target.files.length === 0) return;

      const file = e.target.files[0];

      if (fileType === 'png') {
        setPngFile(file);
        if (jsonFile) {
          onFilesSelect(file, jsonFile);
        }
      } else {
        setJsonFile(file);
        if (pngFile) {
          onFilesSelect(pngFile, file);
        }
      }
    },
    [pngFile, jsonFile, onFilesSelect]
  );

  const handleSubmit = useCallback(() => {
    if (pngFile && jsonFile) {
      onFilesSelect(pngFile, jsonFile);
    }
  }, [pngFile, jsonFile, onFilesSelect]);

  const canSubmit = pngFile && jsonFile && !disabled;

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        className={`
          border-2 border-dashed rounded-lg p-8 text-center transition-colors
          ${dragActive ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-blue-400'}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center space-y-2">
          <svg
            className="w-12 h-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <div className="text-lg font-semibold">
            Drag & drop PNG + JSON here
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Or select files below
          </div>
        </div>
      </div>

      {/* File Selectors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* PNG File */}
        <div className="flex flex-col space-y-2">
          <label className="block text-sm font-medium">
            Background Image (PNG)
          </label>
          <input
            type="file"
            accept="image/png"
            onChange={(e) => handleFileInput(e, 'png')}
            disabled={disabled}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900 dark:file:text-blue-200"
          />
          {pngFile && (
            <div className="text-sm text-green-600 dark:text-green-400">
              ✓ {pngFile.name}
            </div>
          )}
        </div>

        {/* JSON File */}
        <div className="flex flex-col space-y-2">
          <label className="block text-sm font-medium">
            Text Layers (JSON)
          </label>
          <input
            type="file"
            accept="application/json,.json"
            onChange={(e) => handleFileInput(e, 'json')}
            disabled={disabled}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900 dark:file:text-blue-200"
          />
          {jsonFile && (
            <div className="text-sm text-green-600 dark:text-green-400">
              ✓ {jsonFile.name}
            </div>
          )}
        </div>
      </div>

      {/* Submit Button */}
      {pngFile && jsonFile && (
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          Import DOM Layers
        </button>
      )}
    </div>
  );
}
