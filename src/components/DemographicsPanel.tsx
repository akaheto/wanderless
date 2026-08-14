'use client';

import type { Demographics } from '@/lib/integrations/demographics';
import { Card, CardHeader } from '@/components/ui';

interface DemographicsPanelProps {
  demographics: Demographics;
}

/**
 * Display comprehensive demographic information for a city
 * Shows: population, languages, currency, ethnicity, religion, age, employment
 */
export function DemographicsPanel({ demographics }: DemographicsPanelProps) {
  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <Card>
      <CardHeader title="Demographics & Society" note={`Data from ${demographics.populationYear}`} />

      <div className="space-y-6 px-4 py-4">
        {/* Population & Key Stats */}
        <div className="grid grid-cols-3 gap-4 border-b border-line pb-4">
          <div>
            <p className="text-xs font-medium uppercase text-ink-2">Population</p>
            <p className="mt-1 text-lg font-semibold text-ink">
              {formatNumber(demographics.population)}
            </p>
          </div>
          {demographics.populationDensity && (
            <div>
              <p className="text-xs font-medium uppercase text-ink-2">Density</p>
              <p className="mt-1 text-lg font-semibold text-ink">{demographics.populationDensity}/km²</p>
            </div>
          )}
          {demographics.medianAge && (
            <div>
              <p className="text-xs font-medium uppercase text-ink-2">Median Age</p>
              <p className="mt-1 text-lg font-semibold text-ink">{demographics.medianAge}</p>
            </div>
          )}
        </div>

        {/* Languages */}
        <div>
          <h3 className="text-xs font-medium uppercase text-ink-2 mb-3">Languages</h3>
          <div className="space-y-2">
            {demographics.languages.map((lang) => (
              <div key={lang.label} className="flex items-center justify-between">
                <span className="text-sm text-ink">{lang.label}</span>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-24 bg-surface-2 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent"
                      style={{ width: `${lang.percentage}%` }}
                    />
                  </div>
                  <span className="text-xs text-ink-3 w-10 text-right">{lang.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Currency & Economics */}
        <div className="grid grid-cols-2 gap-4 border-t border-b border-line py-4">
          <div>
            <p className="text-xs font-medium uppercase text-ink-2">Currency</p>
            <p className="mt-1 text-sm font-semibold text-ink">{demographics.currency}</p>
            <p className="text-xs text-ink-3">({demographics.currencyCode})</p>
          </div>
          {demographics.employmentRate && (
            <div>
              <p className="text-xs font-medium uppercase text-ink-2">Employment Rate</p>
              <p className="mt-1 text-sm font-semibold text-ink">{demographics.employmentRate}%</p>
              {demographics.unemploymentRate && (
                <p className="text-xs text-ink-3">Unemployed: {demographics.unemploymentRate}%</p>
              )}
            </div>
          )}
        </div>

        {/* Ethnicity */}
        {demographics.ethnicity.length > 0 && (
          <div>
            <h3 className="text-xs font-medium uppercase text-ink-2 mb-3">Ethnic Composition</h3>
            <div className="space-y-2">
              {demographics.ethnicity.map((eth) => (
                <div key={eth.label} className="flex items-center justify-between">
                  <span className="text-sm text-ink">{eth.label}</span>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-24 bg-surface-2 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent-2"
                        style={{ width: `${eth.percentage}%` }}
                      />
                    </div>
                    <span className="text-xs text-ink-3 w-10 text-right">{eth.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Religion */}
        {demographics.religion.length > 0 && (
          <div>
            <h3 className="text-xs font-medium uppercase text-ink-2 mb-3">Religious Affiliation</h3>
            <div className="space-y-2">
              {demographics.religion.map((rel) => (
                <div key={rel.label} className="flex items-center justify-between">
                  <span className="text-sm text-ink">{rel.label}</span>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-24 bg-surface-2 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-good"
                        style={{ width: `${rel.percentage}%` }}
                      />
                    </div>
                    <span className="text-xs text-ink-3 w-10 text-right">{rel.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Age Distribution */}
        {demographics.ageBreakdown.length > 0 && (
          <div>
            <h3 className="text-xs font-medium uppercase text-ink-2 mb-3">Age Distribution</h3>
            <div className="space-y-2">
              {demographics.ageBreakdown.map((age) => (
                <div key={age.ageRange} className="flex items-center justify-between">
                  <span className="text-sm text-ink">{age.label}</span>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-24 bg-surface-2 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-warning"
                        style={{ width: `${age.percentage}%` }}
                      />
                    </div>
                    <span className="text-xs text-ink-3 w-10 text-right">{age.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Timezone */}
        {demographics.timezone && (
          <div className="border-t border-line pt-4">
            <p className="text-xs font-medium uppercase text-ink-2">Time Zone</p>
            <p className="mt-1 text-sm text-ink">{demographics.timezone}</p>
          </div>
        )}

        {/* Data Sources */}
        <div className="border-t border-line pt-4">
          <p className="text-xs font-medium uppercase text-ink-2 mb-2">Data Sources</p>
          <ul className="space-y-1 text-xs text-ink-3">
            {Object.entries(demographics.sources)
              .filter(([, source]) => source)
              .map(([type, source]) => (
                <li key={type}>
                  <strong className="text-ink-2">{type}:</strong> {source}
                </li>
              ))}
          </ul>
        </div>
      </div>
    </Card>
  );
}
