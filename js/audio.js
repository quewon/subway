function applySpacialAudio(howl, id, speakerPosition, listenerPosition, volumeRadius) {
  let distance = speakerPosition.distanceTo(listenerPosition);
  let normalizedDistance = distance/volumeRadius;
  
  let volume = 1 - Math.max(Math.min(normalizedDistance, 1), 0);
  let d = speakerPosition.sub(listenerPosition).normalize();
  let pan = Math.min(Math.max(d.x, -.5), .5);

  howl.volume(volume, id);
  howl.stereo(pan, id);
}

var sounds = {};

var soundslist = {
  "ambience": ["heathrow"],
  "sfx": [
    "train waits", 
    "train layer 1", "train layer 2", "train layer 3",
    "coin bump", "coin toss",
    "click1", "click2", "click3",
    "vending machine",
    "beep", "beep low", "beep high",
    "doors open", "doors close",
    "pick up box", "drop box"
  ],
  "cannedvoice": [
    "house", "apt", "rd", "bridge", "castle", "fort", "gov", "park", "center", "field", "farm", "lake", "river", "bank", "beach", "port", "garden", "wood", "bird", "st", "co", "valley", "mt", "fig", "gum", "hall", "old", "art", "factory", "way", "new", "brook", "town", "univ", "school", "shop", "sleepy", "terminal", "crowd", "train", "church", "rain", "sun",

    "the train for", "is now approaching",
    "this stop is", "station",
    "the next stop is",
    "doors closing",
    "this is the final stop"
  ],
  "radio": ["electronic"],
  "ghost": 3,
}
function load_sounds(onload) {
  console.log("loading sounds...");

  let soundsToLoad = 0;

  for (let folder in soundslist) {
    let data = soundslist[folder];

    if (Array.isArray(data)) {
      sounds[folder] = {};
      for (let filename of data) {
        soundsToLoad++;

        let sound = new Howl({
          src: ["assets/sounds/"+folder+"/"+filename+".wav"]
        });
        sound.once('load', function() {
          soundsToLoad--;
          if (soundsToLoad <= 0) {
            onload();
          }
        });

        sounds[folder][filename] = sound;
      }
    } else {
      sounds[folder] = [];
      for (let i=1; i<=data; i++) {
        soundsToLoad++;

        let sound = new Howl({
          src: ["assets/sounds/"+folder+"/"+i+".wav"]
        });
        sound.once('load', function() {
          soundsToLoad--;
          if (soundsToLoad <= 0) {
            onload();
          }
        });

        sounds[folder].push(sound);
      }
    }
  }
}
