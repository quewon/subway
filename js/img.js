var images = {};

var svgslist = {
  dots: 38,
  tutorial: ["notes"],
  map: ["star"],
  icons: ["train", "rtrain"]
};

function load_images(onload) {
  console.log("loading images...");

  let svgsToLoad = 0;

  for (let folder in svgslist) {
    let data = svgslist[folder];

    if (Array.isArray(data)) {
      images[folder] = {};
      for (let filename of data) {
        svgsToLoad++;

        let svg = new Image();
        svg.src = "assets/svgs/"+folder+"/"+filename+".svg";
        svg.onload = function() {
          svgsToLoad--;
          if (svgsToLoad <= 0) {
            onload();
          }
        };
        images[folder][filename] = svg;
      }
    } else {
      images[folder] = [];
      for (let i=1; i<=data; i++) {
        svgsToLoad++;

        let svg = new Image();
        svg.src = "assets/svgs/"+folder+"/"+i+".svg";
        svg.onload = function() {
          svgsToLoad--;
          if (svgsToLoad <= 0) {
            onload();
          }
        }
        images[folder].push(svg);
      }
    }
  }
}
