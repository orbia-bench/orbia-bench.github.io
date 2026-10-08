export const tiers = [
  {id:1,name:'Control Alignment',short:'Control',color:'#75618F',weight:25,description:'How faithfully does generation follow the requested camera motion? Translation, rotation, movement and turning assess execution; action-only interfaces use movement and turning.'},
  {id:2,name:'Visual Quality',short:'Quality',color:'#66746D',weight:25,description:'How good does the video look? Aesthetic and imaging quality, flickering, motion smoothness and human visual preference assess the generated frames.'},
  {id:3,name:'Input Preservation',short:'Input preservation',color:'#B58A38',weight:10,description:'Does the initial scene survive exploration? Registered query and return views test appearance and geometry, while tracked anchors test identity retention.'},
  {id:4,name:'Generated-content Persistence',short:'Persistence',color:'#388F80',weight:10,description:'Does the model remember what it creates? First observations and revisits test appearance, depth and agreement of reconstructed surfaces.'},
  {id:5,name:'3D Self-consistency',short:'3D consistency',color:'#2866A8',weight:10,description:'Do the generated views describe one 3D world? Cross-view depth and features, regional scale agreement and held-out rendering test internal coherence.'},
  {id:6,name:'Temporal Stability',short:'Stability',color:'#945571',weight:20,description:'Are capabilities sustained over time? Five-second windows track quality, control and local geometry. The tier combines short and minute-long means with 30% and 70% weights.'},
] as const;
