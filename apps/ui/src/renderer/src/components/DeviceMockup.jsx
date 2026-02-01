import React, { useState, useCallback, useRef } from "react";
import {
  Monitor,
  Smartphone,
  Tablet,
  Laptop,
  Tv,
  Download,
  Copy,
  Check,
  Image as ImageIcon,
  ZoomIn,
  ZoomOut,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
// Tabs not needed - using single view
import { ScrollArea } from "./ui/scroll-area";
import { Slider } from "./ui/slider";
import { cn } from "../lib/utils";
import { toast } from "sonner";

// Device presets with realistic frame designs
const DEVICES = {
  iphone15pro: {
    name: "iPhone 15 Pro",
    category: "phone",
    width: 393,
    height: 852,
    radius: 55,
    frameColor: "#1a1a1a",
    frameWidth: 14,
    notchType: "dynamic-island",
    icon: Smartphone,
    bezelColor: "#000",
  },
  iphone14: {
    name: "iPhone 14",
    category: "phone",
    width: 390,
    height: 844,
    radius: 47,
    frameColor: "#2d2d2d",
    frameWidth: 12,
    notchType: "notch",
    icon: Smartphone,
    bezelColor: "#000",
  },
  pixel8: {
    name: "Pixel 8",
    category: "phone",
    width: 412,
    height: 915,
    radius: 40,
    frameColor: "#f0f0f0",
    frameWidth: 10,
    notchType: "punch-hole",
    icon: Smartphone,
    bezelColor: "#e0e0e0",
  },
  samsungS24: {
    name: "Samsung S24 Ultra",
    category: "phone",
    width: 412,
    height: 915,
    radius: 36,
    frameColor: "#2a2a2a",
    frameWidth: 8,
    notchType: "punch-hole",
    icon: Smartphone,
    bezelColor: "#1a1a1a",
  },
  ipadPro: {
    name: 'iPad Pro 12.9"',
    category: "tablet",
    width: 1024,
    height: 1366,
    radius: 30,
    frameColor: "#1a1a1a",
    frameWidth: 20,
    notchType: "none",
    icon: Tablet,
    bezelColor: "#000",
  },
  ipadAir: {
    name: "iPad Air",
    category: "tablet",
    width: 820,
    height: 1180,
    radius: 28,
    frameColor: "#c0c0c0",
    frameWidth: 18,
    notchType: "none",
    icon: Tablet,
    bezelColor: "#888",
  },
  macbookPro: {
    name: 'MacBook Pro 16"',
    category: "laptop",
    width: 1728,
    height: 1117,
    radius: 12,
    frameColor: "#1a1a1a",
    frameWidth: 16,
    notchType: "macbook-notch",
    icon: Laptop,
    bezelColor: "#000",
    hasBase: true,
  },
  macbookAir: {
    name: 'MacBook Air 15"',
    category: "laptop",
    width: 1440,
    height: 960,
    radius: 12,
    frameColor: "#2d2d2d",
    frameWidth: 14,
    notchType: "none",
    icon: Laptop,
    bezelColor: "#1a1a1a",
    hasBase: true,
  },
  imac: {
    name: 'iMac 24"',
    category: "desktop",
    width: 1920,
    height: 1080,
    radius: 16,
    frameColor: "#ffffff",
    frameWidth: 24,
    notchType: "none",
    icon: Monitor,
    bezelColor: "#f0f0f0",
    hasStand: true,
    hasChin: true,
  },
  monitor: {
    name: "Generic Monitor",
    category: "desktop",
    width: 1920,
    height: 1080,
    radius: 8,
    frameColor: "#1a1a1a",
    frameWidth: 12,
    notchType: "none",
    icon: Monitor,
    bezelColor: "#000",
    hasStand: true,
  },
  tv: {
    name: "Smart TV",
    category: "tv",
    width: 1920,
    height: 1080,
    radius: 0,
    frameColor: "#1a1a1a",
    frameWidth: 8,
    notchType: "none",
    icon: Tv,
    bezelColor: "#000",
    hasStand: true,
    standType: "tv",
  },
};

const DEVICE_CATEGORIES = [
  { id: "phone", label: "Phone", icon: Smartphone },
  { id: "tablet", label: "Tablet", icon: Tablet },
  { id: "laptop", label: "Laptop", icon: Laptop },
  { id: "desktop", label: "Desktop", icon: Monitor },
  { id: "tv", label: "TV", icon: Tv },
];

const BACKGROUND_PRESETS = [
  { id: "transparent", name: "Transparent", value: "transparent" },
  { id: "white", name: "White", value: "#ffffff" },
  { id: "black", name: "Black", value: "#000000" },
  {
    id: "gradient-purple",
    name: "Purple Gradient",
    value: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  },
  {
    id: "gradient-blue",
    name: "Blue Gradient",
    value: "linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)",
  },
  {
    id: "gradient-sunset",
    name: "Sunset",
    value: "linear-gradient(135deg, #f97316 0%, #ec4899 50%, #8b5cf6 100%)",
  },
  {
    id: "gradient-ocean",
    name: "Ocean",
    value: "linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)",
  },
  {
    id: "gradient-forest",
    name: "Forest",
    value: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
  },
];

export default function DeviceMockup({ open, onOpenChange, screenshotUrl }) {
  const [selectedDevice, setSelectedDevice] = useState("iphone15pro");
  const [selectedCategory, setSelectedCategory] = useState("phone");
  const [background, setBackground] = useState("gradient-purple");
  const [customBackground, setCustomBackground] = useState("");
  const [scale, setScale] = useState(0.5);
  const [copied, setCopied] = useState(false);
  const [imageUrl, setImageUrl] = useState(screenshotUrl || "");
  const containerRef = useRef(null);
  // Canvas created dynamically in captureElement

  const device = DEVICES[selectedDevice];

  // Filter devices by category
  const filteredDevices = Object.entries(DEVICES).filter(
    ([, dev]) => dev.category === selectedCategory,
  );

  // Get background style
  const getBackgroundStyle = useCallback(() => {
    if (customBackground) {
      if (
        customBackground.startsWith("http") ||
        customBackground.startsWith("data:")
      ) {
        return {
          backgroundImage: `url(${customBackground})`,
          backgroundSize: "cover",
        };
      }
      return { background: customBackground };
    }
    const preset = BACKGROUND_PRESETS.find((p) => p.id === background);
    if (!preset) return {};
    if (preset.value === "transparent") {
      return {
        background: `repeating-conic-gradient(#e0e0e0 0% 25%, #f5f5f5 0% 50%) 50% / 16px 16px`,
      };
    }
    return { background: preset.value };
  }, [background, customBackground]);

  // Render device frame
  const renderDevice = () => {
    if (!device) return null;

    const scaledWidth = device.width * scale;
    const scaledHeight = device.height * scale;
    const scaledRadius = device.radius * scale;
    const scaledFrame = device.frameWidth * scale;

    return (
      <div
        className="relative transition-all duration-300"
        style={{ width: scaledWidth + scaledFrame * 2 }}
      >
        {/* Device Frame */}
        <div
          className="relative overflow-hidden shadow-2xl"
          style={{
            width: scaledWidth + scaledFrame * 2,
            height: scaledHeight + scaledFrame * 2,
            backgroundColor: device.frameColor,
            borderRadius: scaledRadius + scaledFrame,
          }}
        >
          {/* Inner bezel */}
          <div
            className="absolute"
            style={{
              top: scaledFrame,
              left: scaledFrame,
              width: scaledWidth,
              height: scaledHeight,
              backgroundColor: device.bezelColor,
              borderRadius: scaledRadius,
              overflow: "hidden",
            }}
          >
            {/* Screen Content */}
            {imageUrl ? (
              <img
                src={imageUrl}
                alt="Screenshot"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 text-slate-400">
                <div className="text-center">
                  <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No image loaded</p>
                </div>
              </div>
            )}

            {/* Notch / Dynamic Island */}
            {device.notchType === "dynamic-island" && (
              <div
                className="absolute top-3 left-1/2 -translate-x-1/2 bg-black rounded-full"
                style={{
                  width: 90 * scale,
                  height: 28 * scale,
                }}
              />
            )}
            {device.notchType === "notch" && (
              <div
                className="absolute top-0 left-1/2 -translate-x-1/2 bg-black"
                style={{
                  width: 120 * scale,
                  height: 28 * scale,
                  borderRadius: `0 0 ${14 * scale}px ${14 * scale}px`,
                }}
              />
            )}
            {device.notchType === "punch-hole" && (
              <div
                className="absolute top-3 left-1/2 -translate-x-1/2 bg-black rounded-full"
                style={{
                  width: 16 * scale,
                  height: 16 * scale,
                }}
              />
            )}
            {device.notchType === "macbook-notch" && (
              <div
                className="absolute top-0 left-1/2 -translate-x-1/2 bg-black"
                style={{
                  width: 140 * scale,
                  height: 24 * scale,
                  borderRadius: `0 0 ${8 * scale}px ${8 * scale}px`,
                }}
              />
            )}

            {/* Home indicator for modern iPhones */}
            {device.category === "phone" && device.notchType !== "none" && (
              <div
                className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-white/60 rounded-full"
                style={{
                  width: 100 * scale,
                  height: 4 * scale,
                }}
              />
            )}
          </div>

          {/* Side buttons for phones */}
          {device.category === "phone" && (
            <>
              {/* Power button */}
              <div
                className="absolute bg-slate-600 rounded-sm"
                style={{
                  right: -3 * scale,
                  top: 120 * scale,
                  width: 3 * scale,
                  height: 50 * scale,
                }}
              />
              {/* Volume buttons */}
              <div
                className="absolute bg-slate-600 rounded-sm"
                style={{
                  left: -3 * scale,
                  top: 100 * scale,
                  width: 3 * scale,
                  height: 35 * scale,
                }}
              />
              <div
                className="absolute bg-slate-600 rounded-sm"
                style={{
                  left: -3 * scale,
                  top: 145 * scale,
                  width: 3 * scale,
                  height: 50 * scale,
                }}
              />
            </>
          )}
        </div>

        {/* MacBook/iMac base */}
        {device.hasBase && (
          <div className="relative">
            {/* Hinge */}
            <div
              className="mx-auto bg-gradient-to-b from-slate-700 to-slate-800"
              style={{
                width: scaledWidth * 0.12,
                height: 8 * scale,
              }}
            />
            {/* Base */}
            <div
              className="mx-auto rounded-b-lg shadow-lg"
              style={{
                width: scaledWidth * 0.6,
                height: 12 * scale,
                background: device.frameColor,
              }}
            />
          </div>
        )}

        {/* Monitor/TV stand */}
        {device.hasStand && !device.hasBase && (
          <div className="relative flex flex-col items-center">
            {/* iMac chin */}
            {device.hasChin && (
              <div
                className="w-full"
                style={{
                  height: 30 * scale,
                  background: device.frameColor,
                  borderRadius: `0 0 ${scaledRadius}px ${scaledRadius}px`,
                }}
              />
            )}
            {/* Neck */}
            <div
              style={{
                width: 40 * scale,
                height: device.standType === "tv" ? 20 * scale : 60 * scale,
                background: device.hasChin ? "#d0d0d0" : device.frameColor,
              }}
            />
            {/* Base */}
            <div
              className="rounded-full"
              style={{
                width: device.standType === "tv" ? 180 * scale : 160 * scale,
                height: device.standType === "tv" ? 8 * scale : 16 * scale,
                background: device.hasChin ? "#d0d0d0" : device.frameColor,
              }}
            />
          </div>
        )}
      </div>
    );
  };

  // Helper function to create canvas from dom element
  const captureElement = useCallback(
    async (element) => {
      // Create a canvas from the image only (device frame not included in fallback)
      if (!imageUrl) {
        toast.error("Please load an image first");
        return null;
      }

      const img = new Image();
      img.crossOrigin = "anonymous";

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = imageUrl;
      });

      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);

      return canvas;
    },
    [imageUrl],
  );

  // Download as image
  const handleDownload = useCallback(async () => {
    if (!containerRef.current) return;

    try {
      const canvas = await captureElement(containerRef.current);
      if (!canvas) return;

      const link = document.createElement("a");
      link.download = `mockup-${selectedDevice}-${Date.now()}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();

      toast.success("Image downloaded!");
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download image");
    }
  }, [selectedDevice, captureElement]);

  // Copy to clipboard
  const handleCopy = useCallback(async () => {
    if (!containerRef.current) return;

    try {
      const canvas = await captureElement(containerRef.current);
      if (!canvas) return;

      canvas.toBlob(async (blob) => {
        if (!blob) return;
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": blob }),
        ]);
        setCopied(true);
        toast.success("Copied to clipboard!");
        setTimeout(() => setCopied(false), 2000);
      });
    } catch (error) {
      console.error("Copy error:", error);
      toast.error("Failed to copy to clipboard");
    }
  }, [captureElement]);

  // Handle file upload
  const handleFileUpload = useCallback((event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setImageUrl(e.target?.result);
    };
    reader.readAsDataURL(file);
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5 text-primary" />
            Device Mockup Generator
          </DialogTitle>
          <DialogDescription>
            Create beautiful device mockups for your screenshots
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex gap-6 overflow-hidden">
          {/* Left Panel - Settings */}
          <div className="w-72 shrink-0 flex flex-col gap-4 overflow-auto pr-2">
            {/* Image Upload */}
            <div className="space-y-2">
              <Label>Screenshot</Label>
              <div className="flex gap-2">
                <Input
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="Enter URL or upload..."
                  className="flex-1"
                />
                <label className="cursor-pointer">
                  <Button variant="outline" size="icon" asChild>
                    <span>
                      <ImageIcon className="h-4 w-4" />
                    </span>
                  </Button>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Device Category */}
            <div className="space-y-2">
              <Label>Device Category</Label>
              <div className="flex flex-wrap gap-1.5">
                {DEVICE_CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  return (
                    <Button
                      key={cat.id}
                      variant={
                        selectedCategory === cat.id ? "default" : "outline"
                      }
                      size="sm"
                      onClick={() => {
                        setSelectedCategory(cat.id);
                        const firstDevice = Object.entries(DEVICES).find(
                          ([, d]) => d.category === cat.id,
                        );
                        if (firstDevice) setSelectedDevice(firstDevice[0]);
                      }}
                      className="gap-1.5"
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {cat.label}
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Device Selection */}
            <div className="space-y-2">
              <Label>Device</Label>
              <Select value={selectedDevice} onValueChange={setSelectedDevice}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {filteredDevices.map(([key, dev]) => (
                    <SelectItem key={key} value={key}>
                      {dev.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {device && (
                <p className="text-xs text-muted-foreground">
                  {device.width} × {device.height} px
                </p>
              )}
            </div>

            {/* Background */}
            <div className="space-y-2">
              <Label>Background</Label>
              <div className="grid grid-cols-4 gap-1.5">
                {BACKGROUND_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setBackground(preset.id);
                      setCustomBackground("");
                    }}
                    className={cn(
                      "aspect-square rounded-lg transition-all",
                      background === preset.id && !customBackground
                        ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                        : "hover:scale-105",
                    )}
                    style={{
                      background:
                        preset.value === "transparent"
                          ? "repeating-conic-gradient(#e0e0e0 0% 25%, #f5f5f5 0% 50%) 50% / 8px 8px"
                          : preset.value,
                    }}
                    title={preset.name}
                  />
                ))}
              </div>
              <Input
                value={customBackground}
                onChange={(e) => setCustomBackground(e.target.value)}
                placeholder="Custom color or URL..."
                className="mt-2"
              />
            </div>

            {/* Scale */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Scale</Label>
                <span className="text-sm text-muted-foreground">
                  {Math.round(scale * 100)}%
                </span>
              </div>
              <div className="flex items-center gap-2">
                <ZoomOut className="h-4 w-4 text-muted-foreground" />
                <Slider
                  value={[scale * 100]}
                  onValueChange={([v]) => setScale(v / 100)}
                  min={20}
                  max={100}
                  step={5}
                  className="flex-1"
                />
                <ZoomIn className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 mt-auto pt-4 border-t border-border">
              <Button variant="outline" className="flex-1" onClick={handleCopy}>
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </>
                )}
              </Button>
              <Button className="flex-1" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
          </div>

          {/* Right Panel - Preview */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <ScrollArea className="flex-1">
              <div
                ref={containerRef}
                className="min-h-full flex items-center justify-center p-8"
                style={getBackgroundStyle()}
              >
                {renderDevice()}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
