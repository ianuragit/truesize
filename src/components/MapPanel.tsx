import { useId, useMemo } from 'react';
import { PANEL_HEIGHT, PANEL_WIDTH, panelPaths } from '../lib/geo';
import { formatArea, formatInflation } from '../lib/format';
import type { Country, ProjectionKind } from '../types';

const PROJECTION_LABEL: Record<ProjectionKind, string> = {
  mercator: 'Mercator projection',
  equalEarth: 'Equal Earth projection',
};

interface MapPanelProps {
  country: Country;
  kind: ProjectionKind;
  /** Shared with the other panel of the pair — never fitted per country. */
  scale: number;
  revealed: boolean;
}

export function MapPanel({ country, kind, scale, revealed }: MapPanelProps) {
  const clipId = useId();
  const paths = useMemo(() => panelPaths(country, kind, scale), [country, kind, scale]);

  return (
    <div className="panel">
      <p className="panel__projection">{PROJECTION_LABEL[kind]}</p>
      <svg
        className="panel__map"
        viewBox={`0 0 ${PANEL_WIDTH} ${PANEL_HEIGHT}`}
        role="img"
        aria-label={`${country.name} drawn in the ${PROJECTION_LABEL[kind]}`}
      >
        <defs>
          <clipPath id={clipId}>
            <rect x="0" y="0" width={PANEL_WIDTH} height={PANEL_HEIGHT} />
          </clipPath>
        </defs>
        <g clipPath={`url(#${clipId})`}>
          <path className="panel__graticule" d={paths.graticule} />
          <path
            className={revealed ? 'panel__country panel__country--revealed' : 'panel__country'}
            d={paths.country}
          />
        </g>
      </svg>
      <div className="panel__info">
        <p className="panel__name">{country.name}</p>
        {revealed ? (
          <>
            <p className="panel__area">{formatArea(country.trueAreaKm2)}</p>
            <p className="panel__inflation">
              {formatInflation(country.inflation)} Mercator inflation
            </p>
          </>
        ) : (
          <p className="panel__area panel__area--hidden" aria-hidden="true">
            area hidden
          </p>
        )}
      </div>
    </div>
  );
}
