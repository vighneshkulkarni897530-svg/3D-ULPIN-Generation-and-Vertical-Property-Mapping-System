'use client';

import React, { useState } from 'react';
import { PropertyItem, BuildingFloor, PropertyUnit } from '@/types';
import { StatusBadge } from '../common/StatusBadge';
import { 
  Layers, 
  User, 
  Home, 
  CheckCircle, 
  ShieldAlert, 
  Sparkles, 
  FileText,
  DollarSign,
  Maximize2,
  Info
} from 'lucide-react';

interface FloorUnitExplorerProps {
  property: PropertyItem;
}

export const FloorUnitExplorer: React.FC<FloorUnitExplorerProps> = ({ property }) => {
  const building = property.building;
  const floors = building?.floors || [];
  
  const [selectedFloorIndex, setSelectedFloorIndex] = useState<number>(0);
  const [selectedUnit, setSelectedUnit] = useState<PropertyUnit | null>(
    floors[0]?.units[0] || null
  );

  const currentFloor = floors[selectedFloorIndex];

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-tech">
      {/* Explorer Top Header */}
      <div className="p-5 bg-slate-900 text-white border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-extrabold tracking-tight">
              Architectural Floor & Unit Cadastre Explorer
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Explore floor plans, verified unit titles, carpet areas, and individual unit compliance status.
          </p>
        </div>

        {/* Floor Switcher Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1">
          {floors.map((floor, idx) => (
            <button
              key={floor.floorNumber}
              onClick={() => {
                setSelectedFloorIndex(idx);
                setSelectedUnit(floor.units[0] || null);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedFloorIndex === idx
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold shadow-tech-cyan'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              Floor {floor.floorNumber}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Left Floor Plan & Unit Cards + Right Unit Dossier */}
      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
        {/* Left 7 Cols: Floor Units Visual Layout */}
        <div className="lg:col-span-7 p-6 bg-slate-50/50">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-sm font-bold text-slate-900">
                {currentFloor?.name || `Floor ${selectedFloorIndex}`}
              </h4>
              <p className="text-xs text-slate-500">
                Elevation: {currentFloor?.elevationMeters}m • Total Floor Carpet Area: {currentFloor?.carpetAreaSqFt.toLocaleString()} sq ft
              </p>
            </div>
            <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-cyan-100 text-cyan-800 border border-cyan-300 font-semibold">
              {currentFloor?.units.length || 0} Registered Units
            </span>
          </div>

          {/* Interactive Architectural Floor Plan Blueprint */}
          <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-inner mb-6">
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-3 border-b border-slate-800 pb-2">
              <span className="font-mono text-cyan-400">FLOOR PLAN SCHEMATIC</span>
              <span>Click a unit block to inspect</span>
            </div>

            <div className="grid grid-cols-2 gap-3 min-h-[220px]">
              {currentFloor?.units.map((unit) => {
                const isSelected = selectedUnit?.id === unit.id;
                return (
                  <div
                    key={unit.id}
                    onClick={() => setSelectedUnit(unit)}
                    className={`relative p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-cyan-950/40 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.3)] scale-[1.02]'
                        : 'bg-slate-950/80 border-slate-700/80 hover:border-cyan-500/50 hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider block">
                          {unit.type.replace(/_/g, ' ')}
                        </span>
                        <h5 className="text-base font-extrabold text-white mt-0.5">{unit.unitNumber}</h5>
                      </div>
                      <StatusBadge status={unit.verificationStatus} size="sm" />
                    </div>

                    <div className="mt-4 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                      <span className="text-slate-400 font-mono">{unit.carpetAreaSqFt} sq ft</span>
                      <span className="text-slate-300 font-medium truncate max-w-[110px]">{unit.ownerName}</span>
                    </div>

                    {unit.isDisputed && (
                      <div className="absolute -top-1.5 -right-1.5 w-3 h-3 rounded-full bg-rose-500 ring-2 ring-slate-900" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Floor Summary Stats */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 bg-white rounded-xl border border-slate-200">
              <span className="text-[11px] text-slate-500">Floor Level</span>
              <p className="text-base font-extrabold text-slate-900">L{currentFloor?.floorNumber}</p>
            </div>
            <div className="p-3 bg-white rounded-xl border border-slate-200">
              <span className="text-[11px] text-slate-500">Active Units</span>
              <p className="text-base font-extrabold text-slate-900">{currentFloor?.units.length}</p>
            </div>
            <div className="p-3 bg-white rounded-xl border border-slate-200">
              <span className="text-[11px] text-slate-500">Occupancy</span>
              <p className="text-base font-extrabold text-emerald-600">100%</p>
            </div>
          </div>
        </div>

        {/* Right 5 Cols: Selected Unit Full Dossier */}
        <div className="lg:col-span-5 p-6 bg-white flex flex-col justify-between">
          {selectedUnit ? (
            <div className="space-y-5">
              {/* Unit Title & Status */}
              <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-cyan-600 uppercase tracking-wider">
                      UNIT CADASTRE RECORD
                    </span>
                  </div>
                  <h3 className="text-2xl font-extrabold text-slate-900 mt-1">
                    Unit {selectedUnit.unitNumber}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Floor {selectedUnit.floorNumber} • {property.title}
                  </p>
                </div>
                <StatusBadge status={selectedUnit.verificationStatus} size="md" />
              </div>

              {/* Area Specifications */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-slate-500">Carpet Area</span>
                  <p className="text-lg font-extrabold text-slate-900 font-mono">
                    {selectedUnit.carpetAreaSqFt.toLocaleString()}{' '}
                    <span className="text-xs font-normal text-slate-500">sq ft</span>
                  </p>
                </div>
                <div>
                  <span className="text-xs text-slate-500">Super Built-Up Area</span>
                  <p className="text-lg font-extrabold text-slate-900 font-mono">
                    {selectedUnit.builtUpAreaSqFt.toLocaleString()}{' '}
                    <span className="text-xs font-normal text-slate-500">sq ft</span>
                  </p>
                </div>
              </div>

              {/* Ownership & KYC */}
              <div className="space-y-3">
                <h5 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-cyan-600" />
                  Registered Owner Information
                </h5>
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Primary Holder:</span>
                    <span className="font-bold text-slate-900">{selectedUnit.ownerName}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Aadhaar KYC:</span>
                    <span className="font-mono text-slate-700 font-semibold">{selectedUnit.ownerAadhaarMasked}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Occupancy State:</span>
                    <span className="font-semibold text-emerald-600">{selectedUnit.occupancyStatus}</span>
                  </div>
                </div>
              </div>

              {/* Municipal & Tax Assessment */}
              <div className="space-y-2">
                <h5 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-cyan-600" />
                  Tax Assessment & Khata Details
                </h5>
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Tax Assessment No:</span>
                    <span className="font-mono text-slate-900 font-bold">{selectedUnit.taxAssessmentNo}</span>
                  </div>
                  {selectedUnit.monthlyMaintenance && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Society Maintenance:</span>
                      <span className="font-mono text-slate-900 font-semibold">
                        ₹{selectedUnit.monthlyMaintenance.toLocaleString()}/mo
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Dispute Alert if present */}
              {selectedUnit.isDisputed && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <p>
                    <strong className="font-bold">Active Dispute Flagged:</strong> Area calculation variance under investigation. Hearing scheduled with Revenue Authority.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <Home className="w-10 h-10 text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-600">Select a Unit</p>
              <p className="text-xs">Click on any unit in the floor plan to view full cadastral information.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
