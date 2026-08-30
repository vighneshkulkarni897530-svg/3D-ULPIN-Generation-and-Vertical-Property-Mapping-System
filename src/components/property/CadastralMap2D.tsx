'use client';

import React, { useState, useEffect, useRef } from 'react';
import { PropertyItem } from '@/types';
import { 
  Layers, 
  MapPin, 
  Maximize2, 
  Compass, 
  ZoomIn, 
  ZoomOut, 
  Eye, 
  Info, 
  ShieldAlert,
  Ruler,
  Crosshair
} from 'lucide-react';

interface CadastralMap2DProps {
  property: PropertyItem;
}

export const CadastralMap2D: React.FC<CadastralMap2DProps> = ({ property }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [mapLayer, setMapLayer] = useState<'CADASTRAL' | 'SATELLITE' | 'ZONING'>('CADASTRAL');
  const [showAdjacent, setShowAdjacent] = useState(true);
  const [showSurveyStones, setShowSurveyStones] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [hoveredPoint, setHoveredPoint] = useState<string | null>(null);
  const [selectedParcel, setSelectedParcel] = useState<string | null>(property.ulpin);

  // Draw Interactive 2D Cadastre Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Canvas size
    const width = canvas.width;
    const height = canvas.height;

    // Clear
    ctx.clearRect(0, 0, width, height);

    // Background based on layer
    if (mapLayer === 'SATELLITE') {
      ctx.fillStyle = '#0a1612';
      ctx.fillRect(0, 0, width, height);
      // Draw grid texture
      ctx.strokeStyle = '#163328';
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
    } else if (mapLayer === 'ZONING') {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, width, height);
      // Zoning color patch
      ctx.fillStyle = property.landDetails.cadastralZone === 'C1_COMMERCIAL' ? '#083344' : '#14532d';
      ctx.fillRect(40, 40, width - 80, height - 80);
    } else {
      // Default Cadastral Grid
      ctx.fillStyle = '#0B1120';
      ctx.fillRect(0, 0, width, height);

      // Blueprint Cadastral Grid Lines
      ctx.strokeStyle = '#1E293B';
      ctx.lineWidth = 1;
      const step = 30 * zoomLevel;
      for (let x = 0; x < width; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
    }

    const centerX = width / 2;
    const centerY = height / 2;
    const scale = 110 * zoomLevel;

    // Draw Adjacent Parcels if toggled
    if (showAdjacent && property.adjacentParcels) {
      const offsets = [
        { x: 0, y: -scale * 1.5, label: 'North: ' + property.adjacentParcels[0]?.owner },
        { x: scale * 1.6, y: 0, label: 'East: ' + property.adjacentParcels[1]?.owner },
        { x: 0, y: scale * 1.5, label: 'South: ' + property.adjacentParcels[2]?.owner },
        { x: -scale * 1.6, y: 0, label: 'West: ' + property.adjacentParcels[3]?.owner },
      ];

      offsets.forEach((adj, idx) => {
        ctx.save();
        ctx.fillStyle = '#1e293b80';
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);

        const boxW = scale * 1.4;
        const boxH = scale * 1.2;
        const bx = centerX + adj.x - boxW / 2;
        const by = centerY + adj.y - boxH / 2;

        ctx.fillRect(bx, by, boxW, boxH);
        ctx.strokeRect(bx, by, boxW, boxH);

        // Label
        ctx.fillStyle = '#94a3b8';
        ctx.font = '11px Inter, sans-serif';
        ctx.fillText(adj.label || `Adjacent Parcel ${idx + 1}`, bx + 10, by + 25);
        ctx.restore();
      });
    }

    // Main Property Boundary Polygon
    const vertices = [
      { x: centerX - scale, y: centerY - scale * 0.7, id: 'Marker P1 (NW)', coords: '12.9719° N, 77.5941° E' },
      { x: centerX + scale * 1.1, y: centerY - scale * 0.9, id: 'Marker P2 (NE)', coords: '12.9723° N, 77.5952° E' },
      { x: centerX + scale * 0.9, y: centerY + scale * 0.8, id: 'Marker P3 (SE)', coords: '12.9712° N, 77.5958° E' },
      { x: centerX - scale * 0.8, y: centerY + scale * 0.7, id: 'Marker P4 (SW)', coords: '12.9708° N, 77.5945° E' },
    ];

    // Polygon Fill & Stroke
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(vertices[0].x, vertices[0].y);
    for (let i = 1; i < vertices.length; i++) {
      ctx.lineTo(vertices[i].x, vertices[i].y);
    }
    ctx.closePath();

    if (property.hasActiveDispute) {
      ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3;
    } else {
      ctx.fillStyle = 'rgba(6, 182, 212, 0.15)';
      ctx.strokeStyle = '#06B6D4';
      ctx.lineWidth = 2.5;
    }
    ctx.fill();
    ctx.stroke();

    // Fill hatch pattern or glow
    ctx.shadowColor = property.hasActiveDispute ? 'rgba(239,68,68,0.5)' : 'rgba(6, 182, 212, 0.6)';
    ctx.shadowBlur = 15;
    ctx.stroke();
    ctx.restore();

    // Disputed Boundary Segment Callout (if active)
    if (property.hasActiveDispute) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(vertices[3].x, vertices[3].y);
      ctx.lineTo(vertices[0].x, vertices[0].y);
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 6;
      ctx.setLineDash([8, 6]);
      ctx.stroke();

      // Disputed Flag Tag
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 12px Inter, sans-serif';
      ctx.fillText('⚠️ Boundary Discrepancy (2.8m Offset)', centerX - scale * 1.3, centerY);
      ctx.restore();
    }

    // Survey Corner Stones / Monument Markers
    if (showSurveyStones) {
      vertices.forEach((v) => {
        ctx.save();
        ctx.beginPath();
        ctx.arc(v.x, v.y, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#22d3ee';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#020617';
        ctx.stroke();

        // Marker label
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px Inter, sans-serif';
        ctx.fillText(v.id, v.x + 10, v.y - 8);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '10px monospace';
        ctx.fillText(v.coords, v.x + 10, v.y + 6);
        ctx.restore();
      });
    }

    // Property Title & ULPIN at center
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(property.title, centerX, centerY - 15);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 12px monospace';
    ctx.fillText(`ULPIN: ${property.ulpin} | Survey ${property.landDetails.surveyNumber}`, centerX, centerY + 5);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px Inter, sans-serif';
    ctx.fillText(`Area: ${property.landDetails.landAreaAcres} Acres (${property.landDetails.landAreaSqFt.toLocaleString()} sq ft)`, centerX, centerY + 24);
    ctx.restore();

    // Scale Bar in bottom corner
    ctx.save();
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(30, height - 30);
    ctx.lineTo(130, height - 30);
    ctx.moveTo(30, height - 35);
    ctx.lineTo(30, height - 25);
    ctx.moveTo(130, height - 35);
    ctx.lineTo(130, height - 25);
    ctx.stroke();
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '10px monospace';
    ctx.fillText('50 METERS', 55, height - 15);
    ctx.restore();

  }, [property, mapLayer, showAdjacent, showSurveyStones, zoomLevel]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
      {/* Top Map Toolbar */}
      <div className="p-4 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              Cadastral 2D GIS Parcel Map
              {property.hasActiveDispute && (
                <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40">
                  Dispute Flagged
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-400">
              Survey No: <span className="text-slate-200 font-mono">{property.landDetails.surveyNumber}</span> • Hobli: {property.landDetails.hobliOrTehsil}
            </p>
          </div>
        </div>

        {/* Layer & Layer Toggle Pills */}
        <div className="flex items-center gap-2">
          {/* Layer switch */}
          <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-700/80 text-xs">
            <button
              onClick={() => setMapLayer('CADASTRAL')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                mapLayer === 'CADASTRAL' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-300 hover:text-white'
              }`}
            >
              Cadastre
            </button>
            <button
              onClick={() => setMapLayer('SATELLITE')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                mapLayer === 'SATELLITE' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-300 hover:text-white'
              }`}
            >
              Satellite
            </button>
            <button
              onClick={() => setMapLayer('ZONING')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                mapLayer === 'ZONING' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-300 hover:text-white'
              }`}
            >
              Master Plan Zone
            </button>
          </div>

          {/* Toggle Adjacent */}
          <button
            onClick={() => setShowAdjacent(!showAdjacent)}
            className={`p-2 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-colors ${
              showAdjacent
                ? 'bg-blue-950/60 border-blue-500/50 text-blue-300'
                : 'bg-slate-900 border-slate-700 text-slate-400'
            }`}
            title="Toggle Adjacent Land Parcels"
          >
            <Eye className="w-4 h-4" />
            <span className="hidden sm:inline">Adjacent Parcels</span>
          </button>

          {/* Zoom Controls */}
          <div className="flex items-center bg-slate-900 border border-slate-700 rounded-xl overflow-hidden">
            <button
              onClick={() => setZoomLevel((prev) => Math.min(prev + 0.2, 1.8))}
              className="p-2 text-slate-300 hover:text-white hover:bg-slate-800"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => setZoomLevel((prev) => Math.max(prev - 0.2, 0.6))}
              className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 border-l border-slate-700"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="relative w-full h-[450px] sm:h-[500px] bg-slate-950 overflow-hidden flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={800}
          height={500}
          className="w-full h-full object-contain cursor-crosshair"
        />

        {/* Floating Geo-Telemetry Badge */}
        <div className="absolute top-4 left-4 bg-slate-900/90 border border-slate-700/80 p-3 rounded-xl backdrop-blur-md text-xs space-y-1 shadow-lg pointer-events-none">
          <div className="flex items-center gap-2 text-cyan-400 font-mono font-bold">
            <Crosshair className="w-3.5 h-3.5" />
            <span>CENTROID: {property.coordinates.lat.toFixed(4)}° N, {property.coordinates.lng.toFixed(4)}° E</span>
          </div>
          <p className="text-slate-300">
            Datum: <span className="font-mono text-white">WGS 84 / UTM Zone 43N</span>
          </p>
          <p className="text-slate-400">
            Cadastre Accuracy: <span className="text-emerald-400 font-bold">±2.5 cm (RTK DGPS)</span>
          </p>
        </div>

        {/* Legend Box */}
        <div className="absolute bottom-4 right-4 bg-slate-900/90 border border-slate-700/80 p-3 rounded-xl backdrop-blur-md text-[11px] space-y-1.5 shadow-lg">
          <p className="font-bold text-white uppercase tracking-wider text-[10px]">Cadastre Legend</p>
          <div className="flex items-center gap-2 text-slate-300">
            <span className="w-3 h-3 rounded-sm bg-cyan-500/40 border border-cyan-400 inline-block" />
            <span>Target Parcel ({property.landDetails.surveyNumber})</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-300 border border-slate-900 inline-block" />
            <span>DGPS Boundary Corner Stone</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <span className="w-3 h-3 rounded-sm border border-dashed border-slate-500 inline-block" />
            <span>Survey Boundary Buffer</span>
          </div>
        </div>
      </div>
    </div>
  );
};
