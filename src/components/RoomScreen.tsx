import { type MapId, type OathId } from "@/game/engine";
import { MapPreview } from "@/components/MapPreview";
import { OathIntro } from "@/components/OathIntro";

/** One line under each room's name on the intro screen. */
export const ROOM_JOKE: Partial<Record<MapId, string>> = {
  stacks: "The library is closed. The melons have a reservation.",
  annex: "The carpet folded. Nobody told the corn.",
  mezzanine: "The balcony creaks. The melons like the view.",
  rarebooks: "Please do not touch the first editions. The pumpkins did not read the sign.",
  archive: "Somebody turned the lights off. Somebody round and green.",
  greathall: "The hall is very long. So is the queue.",
  readingroom: "Silence in the reading room. The melons are whispering anyway.",
  sorting: "Everything returned tonight goes on the belt. Everything.",
  greenhouse: "The fruit are home. They feel much better here.",
  belltower: "The clock strikes on the hour. The hour is whenever it likes.",
  overflow: "The chute is open. The returns have opinions.",
  courtyard: "The geese want the courtyard. The cats want the geese out of it.",
};

/** The Siege's intro line (night three has its own poster: "Night three", "The Siege"). */
export const SIEGE_JOKE = "The fruit were a distraction. The geese have a plan. The cats have a bigger one.";


/**
 * The intro: the real board, the room's name, and the button onto the carpet. With `oaths`
 * (Sir Michael), the oath cards replace the whole screen (see OathIntro).
 */
export function RoomScreen({
  map,
  kicker,
  title,
  joke,
  action,
  onAction,
  onBack,
  oaths,
}: {
  map: MapId;
  kicker: string;
  title: string;
  joke: string;
  action: string;
  onAction: () => void;
  onBack: () => void;
  oaths?: (oath: OathId) => void;
}) {
  if (oaths) return <OathIntro map={map} title={title} kicker={kicker} onSwear={oaths} onBack={onBack} />;
  return (
    <div className="absolute inset-0 z-20">
      {/* The real board, whole, above the title. */}
      <MapPreview map={map} className="absolute inset-x-0 top-0 bottom-36 h-[calc(100%-9rem)] w-full" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,4,6,0.2)_0%,rgba(8,4,6,0)_40%,rgba(8,4,6,0.88)_100%)]" />
      <div className="absolute inset-x-0 bottom-0 px-4 pb-8 text-center">
        <p className="text-xs tracking-[0.28em] text-gold uppercase">{kicker}</p>
        <h1 className="mt-2 font-display text-4xl font-semibold">{title}</h1>
        <p className="mt-2 text-sm">{joke}</p>
        <button
          type="button"
          className="mt-5 min-h-12 w-full max-w-xs rounded-lg bg-[linear-gradient(180deg,#d4b06a_0%,#8d6730_100%)] text-lg font-semibold text-ink"
          onClick={onAction}
        >
          {action}
        </button>
        <button
          type="button"
          className="mt-3 block w-full text-sm text-muted underline-offset-4 hover:text-parchment hover:underline"
          onClick={onBack}
        >
          Back to setup
        </button>
      </div>
    </div>
  );
}
