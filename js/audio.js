var sounds = {};

var soundslist = {
  "ambience": ["heathrow"],
  "dialogue-random": 1
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

        // let sound = new Audio();
        // sound.src = "assets/sounds/"+folder+"/"+filename+".wav";
        // sound.oncanplaythrough = function() {
        //   soundsToLoad--;
        //   if (soundsToLoad <= 0) {
        //     onload();
        //   }
        //   this.oncanplaythrough = null;
        // };
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

        // let sound = new Audio();
        // sound.src = "assets/sounds/"+folder+"/"+i+".wav";
        // sound.oncanplaythrough = function() {
        //   soundsToLoad--;
        //   if (soundsToLoad <= 0) {
        //     onload();
        //   }
        //   this.oncanplaythrough = null;
        // }
        sounds[folder].push(sound);
      }
    }
  }
}
