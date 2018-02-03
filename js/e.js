// This module is not AMD compliant.
(function() {
  console.log("# e is running");
  var num = 5;

  this.Em = {
    num: num,
    fModule: this.Fm,
  };
}) ();