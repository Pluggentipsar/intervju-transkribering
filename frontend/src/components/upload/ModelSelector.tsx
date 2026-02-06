/**
 * Model selector component.
 */

"use client";

import { useQuery } from "@tanstack/react-query";
import { clsx } from "clsx";
import { Check, Cpu, Zap } from "lucide-react";
import { listModels, getSystemStatus } from "@/services/api";
import type { ModelInfo } from "@/types";

interface ModelSelectorProps {
  selectedModel: string;
  onModelSelect: (modelId: string) => void;
  disabled?: boolean;
}

export function ModelSelector({
  selectedModel,
  onModelSelect,
  disabled = false,
}: ModelSelectorProps) {
  const { data: models = [], isLoading: modelsLoading } = useQuery({
    queryKey: ["models"],
    queryFn: listModels,
  });

  const { data: systemStatus } = useQuery({
    queryKey: ["system-status"],
    queryFn: getSystemStatus,
  });

  if (modelsLoading) {
    return (
      <div className="animate-pulse space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-dark-700 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-white">Välj modell</h3>
        {systemStatus && (
          <div className="flex items-center gap-1 text-sm">
            {systemStatus.gpu_available ? (
              <>
                <Zap className="w-4 h-4 text-green-500" />
                <span className="text-green-400">GPU tillgänglig</span>
              </>
            ) : (
              <>
                <Cpu className="w-4 h-4 text-orange-500" />
                <span className="text-orange-400">Endast CPU</span>
              </>
            )}
          </div>
        )}
      </div>

      <div className="grid gap-3">
        {models.map((model) => (
          <ModelCard
            key={model.id}
            model={model}
            selected={selectedModel === model.id}
            onSelect={() => onModelSelect(model.id)}
            disabled={disabled}
            gpuAvailable={systemStatus?.gpu_available ?? false}
          />
        ))}
      </div>
    </div>
  );
}

interface ModelCardProps {
  model: ModelInfo;
  selected: boolean;
  onSelect: () => void;
  disabled: boolean;
  gpuAvailable: boolean;
}

function ModelCard({ model, selected, onSelect, disabled, gpuAvailable }: ModelCardProps) {
  return (
    <button
      onClick={onSelect}
      disabled={disabled}
      className={clsx(
        "w-full p-4 rounded-lg border-2 text-left transition-all",
        {
          "border-primary-500 bg-primary-500/10": selected,
          "border-white/10 hover:border-white/20 hover:bg-white/5": !selected && !disabled,
          "border-white/10 bg-dark-700 cursor-not-allowed opacity-60": disabled,
        }
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-white">{model.name}</span>
            {model.recommended && (
              <span className="px-2 py-0.5 text-xs font-medium bg-green-500/10 text-green-400 rounded-full">
                Rekommenderas
              </span>
            )}
          </div>
          <p className="text-sm text-gray-400 mt-1">{model.description}</p>
          <p className="text-xs text-gray-500 mt-2">
            Storlek: ~{model.size_mb} MB
          </p>
        </div>
        {selected && (
          <div className="p-1 bg-primary-500 rounded-full">
            <Check className="w-4 h-4 text-white" />
          </div>
        )}
      </div>
    </button>
  );
}
