import React, { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import '@maplibre/maplibre-gl-leaflet';
import 'maplibre-gl/dist/maplibre-gl.css';

export default function GoongMaplibreLayer({ apiKey }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    let glLayer;
    try {
      // @ts-ignore
      glLayer = L.maplibreGL({
        style: `https://tiles.goong.io/assets/goong_map_web.json?api_key=${apiKey}`,
        attribution: '&copy; <a href="https://goong.io">Goong Maps</a> contributors'
      });
      glLayer.addTo(map);
    } catch (e) {
      console.error("Error adding Goong maplibre layer:", e);
    }

    return () => {
      if (glLayer && map) {
        try {
          glLayer.remove();
        } catch (e) {
          // ignore if already removed
        }
      }
    };
  }, [map, apiKey]);

  return null;
}
