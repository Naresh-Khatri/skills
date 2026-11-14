import { Composition } from "remotion";

import { films } from "./films.gen.ts";
import { layoutFilm } from "./kit/layout.ts";
import { FPS, HEIGHT, WIDTH } from "./kit/theme.ts";

export function Root() {
  return (
    <>
      {films.map((film) => (
        <Composition
          key={film.script.id}
          id={film.script.id}
          component={film.component}
          durationInFrames={layoutFilm(film.script, film.voice, film.clips, FPS).frames}
          fps={FPS}
          width={WIDTH}
          height={HEIGHT}
        />
      ))}
    </>
  );
}
