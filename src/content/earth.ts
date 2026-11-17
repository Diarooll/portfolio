// Terra do Contato: texturas de domínio público da NASA e o enquadramento.
// Créditos: NASA Earth Observatory (Blue Marble Next Generation, abril de 2004,
// com relevo e batimetria; Black Marble 2012, luzes das cidades). Imagens da NASA
// são de domínio público nos EUA; os créditos ficam aqui por cortesia.

export const EARTH = {
  day: "/earth/earth-day.webp",
  night: "/earth/earth-night.webp",
  /** inclinação do eixo (graus) */
  tilt: 23.4,
  /** velocidade de rotação (rad/s): bem lenta */
  spin: 0.025,
  /** posição do centro (fração da tela) e raio (fração da altura); a Terra sai do quadro embaixo/direita */
  desktop: { x: 0.8, y: 1.32, r: 0.78 },
  mobile: { x: 0.72, y: 1.14, r: 0.42 },
};

export const EARTH_CREDITS = [
  {
    name: "Blue Marble Next Generation, topography and bathymetry (April 2004)",
    url: "https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/base-topography-bathymetry/",
    license: "NASA imagery, public domain in the US (credit: NASA Earth Observatory)",
  },
  {
    name: "Black Marble 2012, Earth at Night (0.1 degree)",
    url: "https://science.nasa.gov/earth/earth-observatory/earth-at-night/maps/",
    license: "NASA imagery, public domain in the US (credit: NASA Earth Observatory / Suomi NPP)",
  },
];
