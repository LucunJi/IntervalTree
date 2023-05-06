# Interval Tree Visualization

https://lucunji.github.io/IntervalTree/public/

## Features

Most basic functionalities of this applet are made to be similar to those in the existing [KD-Tree Demo](https://students.engineering.wustl.edu/comp_geo_algorithms/KD-Tree/kd.html)
but with some improvements:

- My demo is **compatible** with different browser dimensions. So it is also playable on smartphones.

- The implementation is **faster** with a large number of objects.
Compared to the old KD-Tree implement, which takes about several seconds to respond with 100 points,
my implementation responds almost instantaneously with 100 line segments.

- The line segments and points are **fixed** (not draggable) in building or query mode.
So users will not accidentally move it out of place.

- While building and querying, the line segments and median lines are **color-coded** with the same color as the tree nodes,
so users can have a better sense of the tree's structure.

- The **Finish Subtree** button moves the current node to the parent node, instead of the parent's right child node.
This design makes the simulation more fine-grained and easier to understand.

- When clicking on **Start Query** before finishing building the tree,
my demo will proceed after completing the interval tree,
instead of proceeding with an unfinished tree.

- The user can choose to **sort** the line segments vertically according to the horizontal position of either endpoint.

- This demo is written in **Typescript**.
Typescript is a superset of Javascript: it can do everything people used to do with Javascript.
In addition, Typescript introduces a stronger typing capability, so we can write code with fewer errors,
and use OOP design patterns easier.
Most popular libraries are supporting Typescript, and it is becoming a popular choice.

## Dependencies and References

The functionalities of this demo are made to be similar to the KD-Tree demo,
and I also used the same JSXGraph library.
But all the code is written on my own with references to the official documents of the libraries.

The libraries used in this project are mainly

- JSXGraph: drawing line segments and interval trees.
- Bootstrap 4: making a fancy UI compatible with different dimensions of screens.
I do not choose Bootstrap 5 for better compatibility with earlier browsers.
- typescript: allowing me to program using Typescript, a language more powerful than Javascript
- webpack: bundles all code into a single file, so I only need to load a single script file in HTML.

## Possible Future Improvements

- As an improvement, the demo can also show the pseudocode and highlight the currently running line of code.

- Currently, I only use the Listener design pattern to manage the communication between different components (e.g. buttons, drawing area, and segment tree).
This alone does not make the code loosely coupled enough (so things are entangled together).
I can use more design patterns, such as MVC and Visitor, to make the code more scalable and maintainable.