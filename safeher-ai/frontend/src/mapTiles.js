const KEY = import.meta.env.VITE_CARTO_KEY;
const withKey = (url) => (KEY ? `${url}?key=${KEY}` : url);

export const TILE_DARK  = withKey("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png");
export const TILE_LIGHT = withKey("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png");
export const TILE_ATTRIBUTION = '&copy; OpenStreetMap &copy; CARTO';
