/**
 * The mechanic's vocabulary, explained once.
 *
 * specs/05 required short explanations for thirteen terms. That requirement is
 * almost certainly how the interface ended up with an explanatory paragraph on
 * every panel: the guidance was met by writing prose into the screens, roughly
 * eighty-five blocks of it, which is what the client eventually asked to have
 * removed.
 *
 * The requirement was right and the delivery was wrong. Help belongs against
 * the word it explains, available when somebody wants it and invisible when
 * they do not. Nobody needs to be told what an odometer is twice a day.
 *
 * Written for someone who books the work rather than does it: what the part is
 * for, in the plainest words available, and no more than two sentences.
 */

export const helpTerms: Record<string, string> = {
  odometer: "The total distance the vehicle has travelled, as shown on its dashboard.",

  "fuel efficiency":
    "How far the vehicle goes on one litre of fuel. A higher number means it is using less fuel.",

  "full tank":
    "The tank was filled right up. Fuel efficiency can only be worked out between two full-tank fill-ups, which is why it matters.",

  "tire rotation":
    "Moving the tires to different positions on the vehicle so they wear evenly and last longer.",

  "brake pads":
    "The parts that squeeze the wheels to slow the vehicle down. They wear away with use and have to be replaced.",

  coolant: "The liquid that stops the engine overheating. Sometimes called radiator fluid.",

  "transmission fluid": "The oil that keeps the gearbox changing gears smoothly.",

  "differential oil":
    "Oil for the gears that let the wheels turn at different speeds when the vehicle goes round a corner.",

  "preventive maintenance":
    "Work done on a schedule to stop problems before they happen, instead of waiting for something to break.",

  "spark plug":
    "The part that lights the fuel in a gasoline engine. Diesel engines do not have them.",

  "glow plug":
    "The part that warms a diesel engine so it starts more easily when cold. Gasoline engines do not have them.",

  "def/adblue":
    "A fluid that some diesel vehicles use to clean their exhaust. It is not fuel, and it is topped up separately.",

  "diesel particulate filter":
    "A filter that catches soot in a diesel exhaust. Over time it needs cleaning or replacing.",
};

export function explanationFor(term: string): string | undefined {
  return helpTerms[term.trim().toLowerCase()];
}
