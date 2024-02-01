var sounds = {};
function load_sounds(onload) {
  var folders = {
    // "hit": 18
  };

  if (Object.keys(folders).length == 0) {
    onload();
    return;
  }

  var unloadedSounds = 0;

  for (let folder in folders) {
    sounds[folder] = [];
    for (let i=1; i<=folders[folder]; i++) {
      unloadedSounds++;

      let filenumber = i<10 ? "0"+i : i;

      let sound = new Audio("assets/"+folder+"/"+filenumber+".wav");
      sound.addEventListener("canplaythrough", function() {
        unloadedSounds--;
        if (unloadedSounds == 0) {
          onload();
          unloadedSounds = -1;
        }
      }.bind(this));

      sounds[folder].push(sound);
    }
  }
}
