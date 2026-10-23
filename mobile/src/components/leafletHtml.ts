import type { NearbyClaim } from '@/lib/api'
import { colors, statusOf } from '@/theme'

export interface MapProps {
  lat: number
  lon: number
  radiusKm: number
  claims: NearbyClaim[]
}

/**
 * The same map as the web app: OpenStreetMap tiles in greyscale, a circle for the alert area, a dot for you and a
 * coloured dot per report. Leaflet runs inside a WebView (native) or an iframe (web), so no map API key is needed.
 */
export function leafletHtml({ lat, lon, radiusKm, claims }: MapProps): string {
  const data = JSON.stringify({
    lat, lon, r: radiusKm * 1000,
    claims: claims.map((c) => ({ lat: c.latitude, lon: c.longitude, color: statusOf(c.status).hex, text: c.claim_text.slice(0, 90) })),
  }).replace(/</g, String.fromCharCode(92) + 'u003c') // the page must receive the text backslash-u003c, so a claim containing </script> cannot end the script
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>html,body,#m{height:100%;margin:0;background:#f6f6f6}.mono{filter:grayscale(1) contrast(.9) brightness(1.06)}
.leaflet-tooltip{font:11px ui-monospace,monospace;border-radius:4px;box-shadow:none}</style></head><body><div id="m"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
var d=${data};
var map=L.map('m',{zoomControl:false,attributionControl:true}).setView([d.lat,d.lon],11);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'&copy; OpenStreetMap',className:'mono',maxZoom:18}).addTo(map);
var area=L.circle([d.lat,d.lon],{radius:d.r,color:'${colors.accent}',weight:1,fillOpacity:0.05}).addTo(map);
d.claims.forEach(function(c){L.circleMarker([c.lat,c.lon],{radius:6,color:'#fff',weight:2,fillColor:c.color,fillOpacity:1}).bindTooltip(c.text).addTo(map)});
L.circleMarker([d.lat,d.lon],{radius:7,color:'#fff',weight:3,fillColor:'${colors.accent}',fillOpacity:1}).addTo(map);
map.fitBounds(area.getBounds(),{padding:[24,24]});
</script></body></html>`
}
