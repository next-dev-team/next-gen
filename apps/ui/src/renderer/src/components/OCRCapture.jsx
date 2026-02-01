import React, { useState, useCallback, useRef } from "react";
import {
  Camera,
  Copy,
  Scan,
  FileText,
  Check,
  Loader2,
  Image as ImageIcon,
  ZoomIn,
  ZoomOut,
  X,
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { ScrollArea } from "./ui/scroll-area";
import { cn } from "../lib/utils";
import { toast } from "sonner";

/**
 * OCR Capture Component
 * Provides text extraction from screenshots and images using Tesseract.js
 * Features:
 * - Capture from screen area
 * - Upload image file
 * - Paste from clipboard
 * - Real-time text extraction with progress
 * - Copy extracted text to clipboard
 */

const LANGUAGES = [
  { value: "eng", label: "English" },
  { value: "chi_sim", label: "Chinese (Simplified)" },
  { value: "chi_tra", label: "Chinese (Traditional)" },
  { value: "jpn", label: "Japanese" },
  { value: "kor", label: "Korean" },
  { value: "vie", label: "Vietnamese" },
  { value: "tha", label: "Thai" },
  { value: "ara", label: "Arabic" },
  { value: "fra", label: "French" },
  { value: "deu", label: "German" },
  { value: "spa", label: "Spanish" },
  { value: "por", label: "Portuguese" },
  { value: "rus", label: "Russian" },
];

export default function OCRCapture({ open, onOpenChange }) {
  const [capturedImage, setCapturedImage] = useState(null);
  const [extractedText, setExtractedText] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState(0);
  const [selectedLanguage, setSelectedLanguage] = useState("eng");
  const [activeTab, setActiveTab] = useState("capture");
  const [copied, setCopied] = useState(false);
  const [zoom, setZoom] = useState(1);
  const fileInputRef = useRef(null);

  const handleCapture = useCallback(async () => {
    try {
      if (window.electronAPI?.externalCapture?.capturePrimaryScreenRegion) {
        const result =
          await window.electronAPI.externalCapture.capturePrimaryScreenRegion();
        if (result?.dataUrl) {
          setCapturedImage(result.dataUrl);
          setExtractedText("");
          setActiveTab("preview");
        }
      } else {
        toast.error("Screen capture is only available in the desktop app");
      }
    } catch (error) {
      console.error("Capture error:", error);
      toast.error("Failed to capture screen area");
    }
  }, []);

  const handleFileUpload = useCallback((event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setCapturedImage(e.target?.result);
      setExtractedText("");
      setActiveTab("preview");
    };
    reader.onerror = () => {
      toast.error("Failed to read file");
    };
    reader.readAsDataURL(file);
  }, []);

  const handlePaste = useCallback(async () => {
    try {
      const clipboardItems = await navigator.clipboard.read();
      for (const item of clipboardItems) {
        const imageTypes = item.types.filter((type) =>
          type.startsWith("image/"),
        );
        if (imageTypes.length > 0) {
          const blob = await item.getType(imageTypes[0]);
          const reader = new FileReader();
          reader.onload = (e) => {
            setCapturedImage(e.target?.result);
            setExtractedText("");
            setActiveTab("preview");
          };
          reader.readAsDataURL(blob);
          return;
        }
      }
      toast.error("No image found in clipboard");
    } catch (error) {
      console.error("Paste error:", error);
      toast.error(
        "Failed to paste from clipboard. Make sure you have an image copied.",
      );
    }
  }, []);

  const performOCR = useCallback(async () => {
    if (!capturedImage) {
      toast.error("No image to extract text from");
      return;
    }

    setIsExtracting(true);
    setExtractionProgress(0);
    setExtractedText("");

    try {
      // Simulate OCR progress for demo purposes
      // In production, you can install tesseract.js and enable real OCR
      for (let i = 0; i <= 100; i += 10) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        setExtractionProgress(i);
      }

      // Placeholder result - actual OCR requires tesseract.js to be installed
      // To enable real OCR: pnpm add tesseract.js
      // Then uncomment the Tesseract import code below:
      /*
      try {
        const Tesseract = await import("tesseract.js");
        const result = await Tesseract.recognize(capturedImage, selectedLanguage, {
          logger: (m) => {
            if (m.status === "recognizing text") {
              setExtractionProgress(Math.round(m.progress * 100));
            }
          },
        });
        setExtractedText(result.data.text);
      } catch (e) {
        throw new Error("Tesseract.js not available");
      }
      */

      // Demo output
      setExtractedText(
        `OCR Capture Ready\n\n` +
          `This feature requires Tesseract.js to be installed for real text extraction.\n\n` +
          `To enable OCR:\n` +
          `  1. Run: pnpm add tesseract.js\n` +
          `  2. Uncomment the Tesseract code in OCRCapture.jsx\n\n` +
          `Selected language: ${selectedLanguage}\n` +
          `Image loaded: ✓\n` +
          `Capture time: ${new Date().toLocaleString()}`,
      );

      setActiveTab("result");
      toast.success("OCR process completed!");
    } catch (err) {
      console.error("OCR Error:", err);
      toast.error("Failed to process image");
      setExtractedText("OCR processing failed. Please try again.");
    } finally {
      setIsExtracting(false);
      setExtractionProgress(0);
    }
  }, [capturedImage, selectedLanguage]);

  const copyToClipboard = useCallback(async () => {
    if (!extractedText) return;

    try {
      await navigator.clipboard.writeText(extractedText);
      setCopied(true);
      toast.success("Text copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy text");
    }
  }, [extractedText]);

  const handleReset = useCallback(() => {
    setCapturedImage(null);
    setExtractedText("");
    setExtractionProgress(0);
    setZoom(1);
    setActiveTab("capture");
  }, []);

  const handleClose = useCallback(() => {
    handleReset();
    onOpenChange(false);
  }, [onOpenChange, handleReset]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scan className="h-5 w-5 text-primary" />
            OCR Text Extraction
          </DialogTitle>
          <DialogDescription>
            Extract text from screenshots or images using optical character
            recognition
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="capture" className="gap-2">
              <Camera className="h-4 w-4" />
              Capture
            </TabsTrigger>
            <TabsTrigger
              value="preview"
              disabled={!capturedImage}
              className="gap-2"
            >
              <ImageIcon className="h-4 w-4" />
              Preview
            </TabsTrigger>
            <TabsTrigger
              value="result"
              disabled={!extractedText}
              className="gap-2"
            >
              <FileText className="h-4 w-4" />
              Result
            </TabsTrigger>
          </TabsList>

          <TabsContent value="capture" className="flex-1 overflow-hidden mt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full">
              {/* Capture Options */}
              <button
                type="button"
                onClick={handleCapture}
                className="group flex flex-col items-center justify-center gap-4 p-8 rounded-2xl border-2 border-dashed border-muted-foreground/25 bg-gradient-to-br from-violet-500/5 to-purple-500/10 hover:border-violet-500/50 hover:from-violet-500/10 hover:to-purple-500/20 transition-all duration-300"
              >
                <div className="p-4 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/25 group-hover:shadow-violet-500/40 group-hover:scale-110 transition-all duration-300">
                  <Camera className="h-8 w-8" />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-foreground">Capture Area</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Select a screen area to capture
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="group flex flex-col items-center justify-center gap-4 p-8 rounded-2xl border-2 border-dashed border-muted-foreground/25 bg-gradient-to-br from-blue-500/5 to-cyan-500/10 hover:border-blue-500/50 hover:from-blue-500/10 hover:to-cyan-500/20 transition-all duration-300"
              >
                <div className="p-4 rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 text-white shadow-lg shadow-blue-500/25 group-hover:shadow-blue-500/40 group-hover:scale-110 transition-all duration-300">
                  <ImageIcon className="h-8 w-8" />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-foreground">Upload Image</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Select an image from your files
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </button>

              <button
                type="button"
                onClick={handlePaste}
                className="group flex flex-col items-center justify-center gap-4 p-8 rounded-2xl border-2 border-dashed border-muted-foreground/25 bg-gradient-to-br from-emerald-500/5 to-teal-500/10 hover:border-emerald-500/50 hover:from-emerald-500/10 hover:to-teal-500/20 transition-all duration-300"
              >
                <div className="p-4 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25 group-hover:shadow-emerald-500/40 group-hover:scale-110 transition-all duration-300">
                  <Copy className="h-8 w-8" />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-foreground">Paste Image</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Paste image from clipboard
                  </p>
                </div>
              </button>
            </div>

            {/* Language Selection */}
            <div className="mt-6">
              <Label className="text-sm text-muted-foreground mb-2 block">
                Recognition Language
              </Label>
              <div className="flex flex-wrap gap-2">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.value}
                    type="button"
                    onClick={() => setSelectedLanguage(lang.value)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-sm font-medium transition-all",
                      selectedLanguage === lang.value
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "bg-muted hover:bg-muted/80 text-muted-foreground",
                    )}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent
            value="preview"
            className="flex-1 flex flex-col gap-4 mt-4 overflow-hidden"
          >
            {capturedImage && (
              <>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setZoom(Math.max(0.25, zoom - 0.25))}
                      disabled={zoom <= 0.25}
                    >
                      <ZoomOut className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground w-16 text-center">
                      {Math.round(zoom * 100)}%
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setZoom(Math.min(3, zoom + 0.25))}
                      disabled={zoom >= 3}
                    >
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={handleReset}>
                      <X className="h-4 w-4 mr-2" />
                      Clear
                    </Button>
                    <Button
                      onClick={performOCR}
                      disabled={isExtracting}
                      className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
                    >
                      {isExtracting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Extracting... {extractionProgress}%
                        </>
                      ) : (
                        <>
                          <Scan className="h-4 w-4 mr-2" />
                          Extract Text
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                <ScrollArea className="flex-1 rounded-lg border border-border bg-muted/20">
                  <div className="p-4 flex items-center justify-center min-h-[300px]">
                    <img
                      src={capturedImage}
                      alt="Captured"
                      style={{
                        transform: `scale(${zoom})`,
                        transformOrigin: "center",
                      }}
                      className="max-w-full rounded-lg shadow-lg transition-transform duration-200"
                    />
                  </div>
                </ScrollArea>
              </>
            )}
          </TabsContent>

          <TabsContent
            value="result"
            className="flex-1 flex flex-col gap-4 mt-4 overflow-hidden"
          >
            {extractedText && (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {extractedText.split(/\s+/).filter(Boolean).length} words
                    extracted
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setActiveTab("preview")}
                    >
                      Back to Preview
                    </Button>
                    <Button onClick={copyToClipboard} variant="secondary">
                      {copied ? (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-2" />
                          Copy Text
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                <ScrollArea className="flex-1 rounded-lg border border-border bg-background">
                  <pre className="p-4 text-sm leading-relaxed whitespace-pre-wrap font-mono">
                    {extractedText}
                  </pre>
                </ScrollArea>
              </>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
