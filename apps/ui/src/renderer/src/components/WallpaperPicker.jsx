import React, { useState, useCallback, useEffect } from "react";
import {
  Image as ImageIcon,
  Palette,
  Upload,
  Check,
  X,
  Plus,
  Trash2,
  Sparkles,
  Monitor,
  Smartphone,
  Tablet,
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

const WALLPAPER_STORAGE_KEY = "app-wallpaper-settings";

// Premium gradient wallpapers
const GRADIENT_WALLPAPERS = [
  {
    id: "aurora",
    name: "Aurora",
    gradient: "bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700",
    css: "linear-gradient(135deg, rgb(124, 58, 237) 0%, rgb(147, 51, 234) 50%, rgb(67, 56, 202) 100%)",
  },
  {
    id: "sunset",
    name: "Sunset",
    gradient: "bg-gradient-to-br from-orange-500 via-pink-500 to-rose-600",
    css: "linear-gradient(135deg, rgb(249, 115, 22) 0%, rgb(236, 72, 153) 50%, rgb(225, 29, 72) 100%)",
  },
  {
    id: "ocean",
    name: "Ocean",
    gradient: "bg-gradient-to-br from-cyan-500 via-blue-500 to-indigo-600",
    css: "linear-gradient(135deg, rgb(6, 182, 212) 0%, rgb(59, 130, 246) 50%, rgb(79, 70, 229) 100%)",
  },
  {
    id: "forest",
    name: "Forest",
    gradient: "bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600",
    css: "linear-gradient(135deg, rgb(16, 185, 129) 0%, rgb(20, 184, 166) 50%, rgb(8, 145, 178) 100%)",
  },
  {
    id: "midnight",
    name: "Midnight",
    gradient: "bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900",
    css: "linear-gradient(135deg, rgb(15, 23, 42) 0%, rgb(88, 28, 135) 50%, rgb(15, 23, 42) 100%)",
  },
  {
    id: "cherry",
    name: "Cherry Blossom",
    gradient: "bg-gradient-to-br from-pink-400 via-rose-400 to-fuchsia-500",
    css: "linear-gradient(135deg, rgb(244, 114, 182) 0%, rgb(251, 113, 133) 50%, rgb(217, 70, 239) 100%)",
  },
  {
    id: "cosmic",
    name: "Cosmic",
    gradient: "bg-gradient-to-br from-indigo-900 via-purple-800 to-pink-700",
    css: "linear-gradient(135deg, rgb(49, 46, 129) 0%, rgb(107, 33, 168) 50%, rgb(190, 24, 93) 100%)",
  },
  {
    id: "golden",
    name: "Golden Hour",
    gradient: "bg-gradient-to-br from-amber-400 via-orange-500 to-red-500",
    css: "linear-gradient(135deg, rgb(251, 191, 36) 0%, rgb(249, 115, 22) 50%, rgb(239, 68, 68) 100%)",
  },
  {
    id: "northern",
    name: "Northern Lights",
    gradient: "bg-gradient-to-br from-green-400 via-cyan-500 to-blue-600",
    css: "linear-gradient(135deg, rgb(74, 222, 128) 0%, rgb(6, 182, 212) 50%, rgb(37, 99, 235) 100%)",
  },
  {
    id: "lavender",
    name: "Lavender Fields",
    gradient: "bg-gradient-to-br from-purple-400 via-violet-500 to-indigo-600",
    css: "linear-gradient(135deg, rgb(192, 132, 252) 0%, rgb(139, 92, 246) 50%, rgb(79, 70, 229) 100%)",
  },
  {
    id: "monochrome",
    name: "Monochrome",
    gradient: "bg-gradient-to-br from-zinc-800 via-zinc-700 to-zinc-900",
    css: "linear-gradient(135deg, rgb(39, 39, 42) 0%, rgb(63, 63, 70) 50%, rgb(24, 24, 27) 100%)",
  },
  {
    id: "electric",
    name: "Electric Dreams",
    gradient: "bg-gradient-to-br from-fuchsia-500 via-purple-600 to-blue-700",
    css: "linear-gradient(135deg, rgb(217, 70, 239) 0%, rgb(147, 51, 234) 50%, rgb(29, 78, 216) 100%)",
  },
];

// Solid color wallpapers
const SOLID_COLORS = [
  { id: "slate", name: "Slate", color: "#0f172a", textColor: "white" },
  { id: "zinc", name: "Zinc", color: "#18181b", textColor: "white" },
  { id: "stone", name: "Stone", color: "#1c1917", textColor: "white" },
  { id: "neutral", name: "Neutral", color: "#171717", textColor: "white" },
  { id: "indigo", name: "Indigo", color: "#4338ca", textColor: "white" },
  { id: "violet", name: "Violet", color: "#7c3aed", textColor: "white" },
  { id: "purple", name: "Purple", color: "#9333ea", textColor: "white" },
  { id: "fuchsia", name: "Fuchsia", color: "#c026d3", textColor: "white" },
  { id: "pink", name: "Pink", color: "#db2777", textColor: "white" },
  { id: "rose", name: "Rose", color: "#e11d48", textColor: "white" },
  { id: "red", name: "Red", color: "#dc2626", textColor: "white" },
  { id: "orange", name: "Orange", color: "#ea580c", textColor: "white" },
  { id: "amber", name: "Amber", color: "#d97706", textColor: "white" },
  { id: "yellow", name: "Yellow", color: "#ca8a04", textColor: "white" },
  { id: "lime", name: "Lime", color: "#65a30d", textColor: "white" },
  { id: "green", name: "Green", color: "#16a34a", textColor: "white" },
  { id: "emerald", name: "Emerald", color: "#059669", textColor: "white" },
  { id: "teal", name: "Teal", color: "#0d9488", textColor: "white" },
  { id: "cyan", name: "Cyan", color: "#0891b2", textColor: "white" },
  { id: "sky", name: "Sky", color: "#0284c7", textColor: "white" },
  { id: "blue", name: "Blue", color: "#2563eb", textColor: "white" },
  { id: "white", name: "White", color: "#ffffff", textColor: "black" },
  {
    id: "light-gray",
    name: "Light Gray",
    color: "#f4f4f5",
    textColor: "black",
  },
  { id: "gray", name: "Gray", color: "#a1a1aa", textColor: "black" },
];

// Mesh gradient patterns
const MESH_PATTERNS = [
  {
    id: "mesh-purple",
    name: "Purple Mesh",
    css: "radial-gradient(at 40% 20%, hsla(280,100%,70%,1) 0px, transparent 50%), radial-gradient(at 80% 0%, hsla(240,100%,50%,1) 0px, transparent 50%), radial-gradient(at 0% 50%, hsla(340,100%,50%,1) 0px, transparent 50%), radial-gradient(at 80% 50%, hsla(180,100%,40%,1) 0px, transparent 50%), radial-gradient(at 0% 100%, hsla(270,100%,70%,1) 0px, transparent 50%), radial-gradient(at 80% 100%, hsla(150,100%,50%,1) 0px, transparent 50%), radial-gradient(at 0% 0%, hsla(320,100%,70%,1) 0px, transparent 50%)",
    baseColor: "#1a1a2e",
  },
  {
    id: "mesh-ocean",
    name: "Ocean Mesh",
    css: "radial-gradient(at 0% 0%, hsla(190,100%,60%,1) 0px, transparent 50%), radial-gradient(at 100% 0%, hsla(220,100%,50%,1) 0px, transparent 50%), radial-gradient(at 100% 100%, hsla(200,100%,40%,1) 0px, transparent 50%), radial-gradient(at 0% 100%, hsla(180,100%,70%,1) 0px, transparent 50%)",
    baseColor: "#0c1929",
  },
  {
    id: "mesh-aurora",
    name: "Aurora Mesh",
    css: "radial-gradient(at 0% 0%, hsla(160,100%,50%,1) 0px, transparent 50%), radial-gradient(at 100% 0%, hsla(280,100%,50%,1) 0px, transparent 50%), radial-gradient(at 100% 100%, hsla(200,100%,40%,1) 0px, transparent 50%), radial-gradient(at 0% 100%, hsla(100,100%,50%,1) 0px, transparent 50%)",
    baseColor: "#0a1929",
  },
  {
    id: "mesh-sunset",
    name: "Sunset Mesh",
    css: "radial-gradient(at 0% 0%, hsla(30,100%,60%,1) 0px, transparent 50%), radial-gradient(at 100% 0%, hsla(350,100%,50%,1) 0px, transparent 50%), radial-gradient(at 100% 100%, hsla(280,100%,40%,1) 0px, transparent 50%), radial-gradient(at 0% 100%, hsla(60,100%,50%,1) 0px, transparent 50%)",
    baseColor: "#1a1020",
  },
];

export default function WallpaperPicker({ open, onOpenChange }) {
  const [activeTab, setActiveTab] = useState("gradients");
  const [selectedWallpaper, setSelectedWallpaper] = useState(null);
  const [customImages, setCustomImages] = useState([]);
  const [previewDevice, setPreviewDevice] = useState("desktop");

  // Load saved settings
  useEffect(() => {
    try {
      const saved = localStorage.getItem(WALLPAPER_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.wallpaper) setSelectedWallpaper(parsed.wallpaper);
        if (parsed.customImages) setCustomImages(parsed.customImages);
      }
    } catch {}
  }, []);

  // Apply wallpaper to document
  const applyWallpaper = useCallback(
    (wallpaper) => {
      if (!wallpaper) return;

      const root = document.documentElement;

      // Remove previous wallpaper styles
      root.style.removeProperty("--app-wallpaper");
      root.style.removeProperty("--app-wallpaper-color");

      if (wallpaper.type === "gradient") {
        root.style.setProperty("--app-wallpaper", wallpaper.css);
      } else if (wallpaper.type === "solid") {
        root.style.setProperty("--app-wallpaper-color", wallpaper.color);
      } else if (wallpaper.type === "mesh") {
        root.style.setProperty("--app-wallpaper", wallpaper.css);
        root.style.setProperty("--app-wallpaper-color", wallpaper.baseColor);
      } else if (wallpaper.type === "image") {
        root.style.setProperty("--app-wallpaper", `url(${wallpaper.url})`);
      }

      // Save to localStorage
      const settings = {
        wallpaper,
        customImages,
      };
      localStorage.setItem(WALLPAPER_STORAGE_KEY, JSON.stringify(settings));
    },
    [customImages],
  );

  const handleSelectGradient = useCallback(
    (gradient) => {
      const wallpaper = {
        type: "gradient",
        id: gradient.id,
        name: gradient.name,
        css: gradient.css,
      };
      setSelectedWallpaper(wallpaper);
      applyWallpaper(wallpaper);
      toast.success(`Applied ${gradient.name} wallpaper`);
    },
    [applyWallpaper],
  );

  const handleSelectColor = useCallback(
    (color) => {
      const wallpaper = {
        type: "solid",
        id: color.id,
        name: color.name,
        color: color.color,
      };
      setSelectedWallpaper(wallpaper);
      applyWallpaper(wallpaper);
      toast.success(`Applied ${color.name} color`);
    },
    [applyWallpaper],
  );

  const handleSelectMesh = useCallback(
    (mesh) => {
      const wallpaper = {
        type: "mesh",
        id: mesh.id,
        name: mesh.name,
        css: mesh.css,
        baseColor: mesh.baseColor,
      };
      setSelectedWallpaper(wallpaper);
      applyWallpaper(wallpaper);
      toast.success(`Applied ${mesh.name} pattern`);
    },
    [applyWallpaper],
  );

  const handleUploadImage = useCallback(
    (event) => {
      const file = event.target.files?.[0];
      if (!file) return;

      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file");
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        toast.error("Image size must be less than 10MB");
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const newImage = {
          id: `custom-${Date.now()}`,
          name: file.name,
          url: e.target?.result,
        };
        setCustomImages((prev) => [...prev, newImage]);

        const wallpaper = {
          type: "image",
          id: newImage.id,
          name: newImage.name,
          url: newImage.url,
        };
        setSelectedWallpaper(wallpaper);
        applyWallpaper(wallpaper);
        toast.success("Custom wallpaper added");
      };
      reader.readAsDataURL(file);
    },
    [applyWallpaper],
  );

  const handleRemoveCustomImage = useCallback(
    (imageId) => {
      setCustomImages((prev) => prev.filter((img) => img.id !== imageId));
      if (selectedWallpaper?.id === imageId) {
        setSelectedWallpaper(null);
      }
      toast.success("Custom wallpaper removed");
    },
    [selectedWallpaper],
  );

  const handleSelectCustomImage = useCallback(
    (image) => {
      const wallpaper = {
        type: "image",
        id: image.id,
        name: image.name,
        url: image.url,
      };
      setSelectedWallpaper(wallpaper);
      applyWallpaper(wallpaper);
      toast.success(`Applied ${image.name}`);
    },
    [applyWallpaper],
  );

  const handleReset = useCallback(() => {
    setSelectedWallpaper(null);
    const root = document.documentElement;
    root.style.removeProperty("--app-wallpaper");
    root.style.removeProperty("--app-wallpaper-color");
    localStorage.removeItem(WALLPAPER_STORAGE_KEY);
    toast.success("Wallpaper reset to default");
  }, []);

  const getPreviewStyle = useCallback(() => {
    if (!selectedWallpaper) return {};

    if (
      selectedWallpaper.type === "gradient" ||
      selectedWallpaper.type === "mesh"
    ) {
      return {
        background: selectedWallpaper.css,
        backgroundColor: selectedWallpaper.baseColor || "#1a1a2e",
      };
    }
    if (selectedWallpaper.type === "solid") {
      return { backgroundColor: selectedWallpaper.color };
    }
    if (selectedWallpaper.type === "image") {
      return {
        backgroundImage: `url(${selectedWallpaper.url})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      };
    }
    return {};
  }, [selectedWallpaper]);

  const deviceSizes = {
    desktop: { width: 320, height: 200 },
    tablet: { width: 200, height: 280 },
    phone: { width: 120, height: 260 },
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            Wallpaper Settings
          </DialogTitle>
          <DialogDescription>
            Customize your app background with beautiful wallpapers and
            gradients
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex gap-6 overflow-hidden">
          {/* Wallpaper Options */}
          <div className="flex-1 overflow-hidden">
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="h-full flex flex-col"
            >
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="gradients" className="gap-1.5 text-sm">
                  <Sparkles className="h-3.5 w-3.5" />
                  Gradients
                </TabsTrigger>
                <TabsTrigger value="solid" className="gap-1.5 text-sm">
                  <Palette className="h-3.5 w-3.5" />
                  Solid
                </TabsTrigger>
                <TabsTrigger value="mesh" className="gap-1.5 text-sm">
                  <ImageIcon className="h-3.5 w-3.5" />
                  Mesh
                </TabsTrigger>
                <TabsTrigger value="custom" className="gap-1.5 text-sm">
                  <Upload className="h-3.5 w-3.5" />
                  Custom
                </TabsTrigger>
              </TabsList>

              <ScrollArea className="flex-1 mt-4">
                <TabsContent value="gradients" className="mt-0">
                  <div className="grid grid-cols-3 gap-3">
                    {GRADIENT_WALLPAPERS.map((gradient) => (
                      <button
                        key={gradient.id}
                        type="button"
                        onClick={() => handleSelectGradient(gradient)}
                        className={cn(
                          "relative aspect-video rounded-xl overflow-hidden transition-all duration-200 hover:scale-[1.02] hover:shadow-lg",
                          selectedWallpaper?.id === gradient.id &&
                            "ring-2 ring-primary ring-offset-2 ring-offset-background",
                        )}
                      >
                        <div
                          className={cn("absolute inset-0", gradient.gradient)}
                        />
                        <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors" />
                        <div className="absolute bottom-1.5 left-2 right-2 flex items-center justify-between">
                          <span className="text-xs font-medium text-white drop-shadow-sm">
                            {gradient.name}
                          </span>
                          {selectedWallpaper?.id === gradient.id && (
                            <Check className="h-4 w-4 text-white drop-shadow" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="solid" className="mt-0">
                  <div className="grid grid-cols-6 gap-2">
                    {SOLID_COLORS.map((color) => (
                      <button
                        key={color.id}
                        type="button"
                        onClick={() => handleSelectColor(color)}
                        className={cn(
                          "relative aspect-square rounded-lg overflow-hidden transition-all duration-200 hover:scale-110 hover:shadow-lg",
                          selectedWallpaper?.id === color.id &&
                            "ring-2 ring-primary ring-offset-2 ring-offset-background",
                        )}
                        style={{ backgroundColor: color.color }}
                        title={color.name}
                      >
                        {selectedWallpaper?.id === color.id && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Check
                              className="h-4 w-4"
                              style={{ color: color.textColor }}
                            />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="mesh" className="mt-0">
                  <div className="grid grid-cols-2 gap-3">
                    {MESH_PATTERNS.map((mesh) => (
                      <button
                        key={mesh.id}
                        type="button"
                        onClick={() => handleSelectMesh(mesh)}
                        className={cn(
                          "relative aspect-video rounded-xl overflow-hidden transition-all duration-200 hover:scale-[1.02] hover:shadow-lg",
                          selectedWallpaper?.id === mesh.id &&
                            "ring-2 ring-primary ring-offset-2 ring-offset-background",
                        )}
                      >
                        <div
                          className="absolute inset-0"
                          style={{
                            background: mesh.css,
                            backgroundColor: mesh.baseColor,
                          }}
                        />
                        <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors" />
                        <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between">
                          <span className="text-xs font-medium text-white drop-shadow-sm">
                            {mesh.name}
                          </span>
                          {selectedWallpaper?.id === mesh.id && (
                            <Check className="h-4 w-4 text-white drop-shadow" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="custom" className="mt-0">
                  <div className="space-y-4">
                    {/* Upload button */}
                    <label className="flex flex-col items-center justify-center gap-3 p-8 rounded-xl border-2 border-dashed border-muted-foreground/25 bg-muted/20 hover:border-primary/50 hover:bg-muted/30 transition-all cursor-pointer">
                      <div className="p-3 rounded-full bg-primary/10">
                        <Plus className="h-6 w-6 text-primary" />
                      </div>
                      <div className="text-center">
                        <p className="font-medium text-foreground">
                          Upload Custom Wallpaper
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          JPG, PNG, or WebP up to 10MB
                        </p>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleUploadImage}
                        className="hidden"
                      />
                    </label>

                    {/* Custom images grid */}
                    {customImages.length > 0 && (
                      <div className="grid grid-cols-3 gap-3">
                        {customImages.map((image) => (
                          <div
                            key={image.id}
                            className={cn(
                              "relative aspect-video rounded-xl overflow-hidden group",
                              selectedWallpaper?.id === image.id &&
                                "ring-2 ring-primary ring-offset-2 ring-offset-background",
                            )}
                          >
                            <button
                              type="button"
                              onClick={() => handleSelectCustomImage(image)}
                              className="absolute inset-0"
                            >
                              <img
                                src={image.url}
                                alt={image.name}
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveCustomImage(image.id);
                              }}
                              className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                            {selectedWallpaper?.id === image.id && (
                              <div className="absolute bottom-2 right-2">
                                <Check className="h-4 w-4 text-white drop-shadow" />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>
              </ScrollArea>
            </Tabs>
          </div>

          {/* Preview Panel */}
          <div className="w-80 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Preview</Label>
              <div className="flex items-center gap-1">
                {[
                  { key: "desktop", icon: Monitor },
                  { key: "tablet", icon: Tablet },
                  { key: "phone", icon: Smartphone },
                ].map(({ key, icon: Icon }) => (
                  <Button
                    key={key}
                    variant={previewDevice === key ? "secondary" : "ghost"}
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setPreviewDevice(key)}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex-1 flex items-center justify-center bg-muted/30 rounded-xl border border-border p-4">
              <div
                className="relative rounded-lg shadow-2xl overflow-hidden transition-all duration-300"
                style={{
                  width: deviceSizes[previewDevice].width,
                  height: deviceSizes[previewDevice].height,
                  ...getPreviewStyle(),
                }}
              >
                {!selectedWallpaper && (
                  <div className="absolute inset-0 flex items-center justify-center bg-muted text-muted-foreground text-xs">
                    Select a wallpaper
                  </div>
                )}
                {previewDevice === "desktop" && (
                  <div className="absolute bottom-3 left-3 right-3 h-8 bg-black/30 backdrop-blur-sm rounded-lg" />
                )}
                {(previewDevice === "phone" || previewDevice === "tablet") && (
                  <>
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 w-16 h-1.5 bg-black/30 rounded-full" />
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-8 h-1 bg-black/30 rounded-full" />
                  </>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleReset}
              >
                <X className="h-4 w-4 mr-2" />
                Reset
              </Button>
              <Button
                variant="default"
                className="flex-1"
                onClick={() => onOpenChange(false)}
              >
                <Check className="h-4 w-4 mr-2" />
                Done
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
