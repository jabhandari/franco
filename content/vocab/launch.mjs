// Original Franco examples. Levelled editorial batches; harvesting in the
// builder adds lesson/track provenance where a word already exists there.
// Keep the French article: it teaches gender and disambiguates noun senses.
export const batches = [
  { level:'A1', fr:'Voici {word}.', en:'Here is {gloss}.', entries:`
le chat|the cat
le chien|the dog
le cheval|the horse
la vache|the cow
le mouton|the sheep
le poisson|the fish
le lapin|the rabbit
la poule|the hen
le canard|the duck
la souris|the mouse
le père|the father
la mère|the mother
le frère|the brother
la sœur|the sister
le fils|the son
la fille|the girl
le bébé|the baby
la famille|the family
le garçon|the boy
la femme|the woman
le mari|the husband
la grand-mère|the grandmother
le grand-père|the grandfather
le cousin|the male cousin
la cousine|the female cousin
la maison|the house
la chambre|the bedroom
la cuisine|the kitchen
la salle de bains|the bathroom
le salon|the living room
la porte|the door
la fenêtre|the window
le mur|the wall
le toit|the roof
le jardin|the garden
la table|the table
la chaise|the chair
le lit|the bed
le canapé|the sofa
la lampe|the lamp
le tapis|the rug
le bureau|the desk
le miroir|the mirror
la clé|the key
le téléphone|the telephone
le livre|the book
le cahier|the notebook
le stylo|the pen
le crayon|the pencil
la gomme|the eraser
la règle|the ruler
le sac|the bag
la photo|the photo
la carte|the map
la lettre|the letter
le journal|the newspaper
le cadeau|the gift
la boîte|the box
la bouteille|the bottle
le verre|the drinking glass
la tasse|the cup
le bol|the bowl
la fourchette|the fork
le couteau|the knife
la cuillère|the spoon
la serviette|the napkin
le pain|the bread
le beurre|the butter
le fromage|the cheese
le lait|the milk
le café|the coffee
le thé|the tea
le sucre|the sugar
le sel|the salt
le riz|the rice
la pomme|the apple
la banane|the banana
la tomate|the tomato
la carotte|the carrot
la salade|the salad
le poulet|the chicken
la viande|the meat
le gâteau|the cake
le chocolat|the chocolate
le jus|the juice
le repas|the meal
le petit déjeuner|the breakfast
le déjeuner|the lunch
le dîner|the dinner
la glace|the ice cream
la voiture|the car
le vélo|the bicycle
le bus|the bus
le train|the train
le bateau|the boat
la moto|the motorcycle
la rue|the street
la route|the road
la gare|the railway station
le magasin|the shop
le restaurant|the restaurant
la boulangerie|the bakery
la pharmacie|the pharmacy
la banque|the bank
la poste|the post office
le marché|the market
le parc|the park
la plage|the beach
la montagne|the mountain
la rivière|the river
le pont|the bridge
la ville|the town
le village|the village
la place|the square
le cinéma|the cinema
le musée|the museum
le stade|the stadium
la piscine|the swimming pool
le soleil|the sun
la lune|the moon
le ciel|the sky
la pluie|the rain
la neige|the snow
le nuage|the cloud
le vent|the wind
la fleur|the flower
la feuille|the leaf
le fruit|the fruit
la forêt|the forest
la mer|the sea
le pantalon|the pair of trousers
la chemise|the shirt
la robe|the dress
la jupe|the skirt
le manteau|the coat
le chapeau|the hat
la chaussure|the shoe
la chaussette|the sock
le pull|the sweater
la veste|the jacket
la tête|the head
la main|the hand
le bras|the arm
le pied|the foot
la jambe|the leg
le nez|the nose
la bouche|the mouth
la dent|the tooth
le visage|the face
le dos|the back
` },
  { level:'A2', fr:'Nous parlons {topic}.', en:'We are talking about {gloss}.', entries:`
le voyage|the trip
le séjour|the stay
la réservation|the reservation
le billet|the ticket
le passeport|the passport
la valise|the suitcase
la douane|the customs service
le départ|the departure
le retour|the return
le quai|the platform
le trajet|the journey
le vol|the flight
la destination|the destination
le guide|the guide
la visite|the visit
le monument|the monument
le quartier|the neighborhood
le logement|the accommodation
le loyer|the rent
le locataire|the tenant
le propriétaire|the owner
le balcon|the balcony
le couloir|the corridor
la cave|the cellar
le grenier|the attic
le déménagement|the move to a new home
le meuble|the piece of furniture
le réfrigérateur|the refrigerator
le four|the oven
le chauffage|the heating
le robinet|the tap
la douche|the shower
la baignoire|the bathtub
le rideau|the curtain
le ménage|the housework
la lessive|the laundry
le savon|the soap
la brosse|the brush
le dentifrice|the toothpaste
le parapluie|the umbrella
le portefeuille|the wallet
la montre|the watch
le bijou|the piece of jewelry
la ceinture|the belt
la taille|the size
la pointure|the shoe size
le prix|the price
la réduction|the discount
la caisse|the checkout
le reçu|the receipt
la monnaie|the change
le paiement|the payment
la facture|the bill
le compte|the account
le distributeur|the cash machine
le budget|the budget
la dépense|the expense
le salaire|the salary
le métier|the occupation
le travail|the work
le collègue|the colleague
la réunion|the meeting
le rendez-vous|the appointment
la pause|the break
le stage|the internship
le contrat|the contract
la candidature|the job application
le diplôme|the diploma
la formation|the training
le cours|the class
le devoir|the homework assignment
la note|the grade
le professeur|the teacher
la matière|the school subject
le dictionnaire|the dictionary
la traduction|the translation
la prononciation|the pronunciation
la question|the question
la réponse|the answer
la phrase|the sentence
le mot|the word
le texte|the text
le message|the message
le courriel|the email
le timbre|the stamp
le colis|the parcel
le formulaire|the form
la signature|the signature
le document|the document
la demande|the request
la santé|health
le médecin|the doctor
le dentiste|the dentist
la maladie|the illness
la douleur|the pain
la fièvre|the fever
le rhume|the cold
la toux|the cough
le médicament|the medicine
le traitement|the treatment
la blessure|the injury
le secours|the assistance
le danger|the danger
la sécurité|the safety
la panne|the breakdown
la réparation|the repair
le retard|the delay
la circulation|the traffic
le carrefour|the crossroads
le feu rouge|the red traffic light
le trottoir|the sidewalk
le passage piéton|the pedestrian crossing
la station|the station
la ligne|the line
la correspondance|the connection
le conducteur|the driver
le passager|the passenger
le permis|the permit
le parking|the parking lot
le carburant|the fuel
le loisir|the leisure activity
la randonnée|the hike
le spectacle|the show
le concert|the concert
la chanson|the song
le chanteur|the singer
la musique|the music
le dessin|the drawing
la peinture|the painting
le roman|the novel
la recette|the recipe
la cuisson|the cooking process
le goût|the taste
le dessert|the dessert
le légume|the vegetable
la soupe|the soup
la sauce|the sauce
la farine|the flour
la confiture|the jam
le miel|the honey
la saison|the season
le printemps|the spring season
le temps|the weather
la température|the temperature
la chaleur|the heat
le froid|the cold weather
le bonheur|the happiness
la surprise|the surprise
la peur|the fear
la colère|the anger
` },
  { level:'B1', fr:'La discussion porte sur {word}.', en:'The discussion is about {gloss}.', entries:`
la société|society
la citoyenneté|citizenship
la communauté|the community
la population|the population
la majorité|the majority
la minorité|the minority
la génération|the generation
la jeunesse|young people
la retraite|retirement
la solidarité|solidarity
le bénévolat|volunteer work
la pauvreté|poverty
la richesse|wealth
la différence|the difference
la diversité|diversity
la tradition|the tradition
la coutume|the custom
la fête|the celebration
le comportement|the behavior
la politesse|politeness
le respect|respect
la confiance|trust
la responsabilité|responsibility
la liberté|freedom
la justice|justice
la loi|the law
le droit|the right
le devoir civique|the civic duty
le vote|the vote
la mairie|the town hall
le maire|the mayor
le gouvernement|the government
le débat|the debate
la décision|the decision
la solution|the solution
le problème|the problem
la conséquence|the consequence
la cause|the cause
le risque|the risk
le changement|the change
le progrès|progress
le développement|development
le projet|the project
le résultat|the result
la réussite|success
la difficulté|the difficulty
le besoin|the need
le conseil|the advice
la proposition|the proposal
le choix|the choice
la consommation|consumption
la publicité|advertising
le produit|the product
la marque|the brand
la qualité|quality
la quantité|quantity
le service|the service
la livraison|the delivery
la garantie|the guarantee
la réclamation|the complaint
la pollution|pollution
le recyclage|recycling
le déchet|the waste material
le climat|the climate
la nature|nature
la ressource|the resource
la protection|protection
la biodiversité|biodiversity
la sécheresse|the drought
la catastrophe|the disaster
la recherche|research
la découverte|the discovery
la science|science
la technologie|technology
le réseau|the network
le logiciel|the software
le fichier|the file
le mot de passe|the password
la connexion|the connection
la donnée|the piece of data
le média|the media outlet
la presse|the press
le reportage|the news report
le témoignage|the testimony
la rumeur|the rumor
la vérité|the truth
le mensonge|the lie
la preuve|the evidence
la source|the source
la critique|the criticism
la compétence|the skill
la carrière|the career
la promotion|the promotion
le chômage|unemployment
le recrutement|recruitment
la motivation|motivation
la coopération|cooperation
la concurrence|competition
la négociation|negotiation
la rémunération|pay
` },
  { level:'B2', fr:'Le rapport examine {word} en détail.', en:'The report examines {gloss} in detail.', entries:`
la gouvernance|governance
la démocratie|democracy
la législation|legislation
la réglementation|regulation
la réforme|the reform
la constitution|the constitution
le parlement|parliament
le scrutin|the ballot
la campagne électorale|the election campaign
le suffrage|voting rights
la souveraineté|sovereignty
la diplomatie|diplomacy
le partenariat|the partnership
la convention|the convention
la transparence|transparency
la corruption|corruption
la discrimination|discrimination
la précarité|insecurity of living conditions
la marginalisation|marginalization
la cohésion|cohesion
la mobilité|mobility
la mixité|social mixing
la parité|equal representation
la laïcité|secularism
la tolérance|tolerance
le préjugé|the prejudice
le stéréotype|the stereotype
la sensibilisation|awareness raising
la prévention|prevention
la médiation|mediation
le financement|funding
la subvention|the subsidy
la fiscalité|taxation
le prélèvement|the levy
la croissance|growth
la récession|the recession
le déficit|the deficit
la dette|the debt
le rendement|the return on investment
la rentabilité|profitability
la productivité|productivity
la compétitivité|competitiveness
la mondialisation|globalization
la délocalisation|the relocation of production abroad
la sous-traitance|subcontracting
la pénurie|the shortage
la prévision|the forecast
la fluctuation|the fluctuation
le pouvoir d’achat|purchasing power
le seuil|the threshold
la transition|the transition
la durabilité|sustainability
la sobriété|restraint in consumption
la déforestation|deforestation
la désertification|desertification
le réchauffement|warming
la combustion|combustion
le combustible|the fuel
la matière première|the raw material
le gaspillage|waste
la traçabilité|traceability
la conformité|compliance
la fiabilité|reliability
la faisabilité|feasibility
la pertinence|relevance
la validité|validity
la portée|the scope
la démarche|the approach
le dispositif|the system put in place
le bilan|the overall assessment
la synthèse|the synthesis
la problématique|the central issue
le constat|the finding
la tendance|the trend
la corrélation|the correlation
la causalité|causation
le biais|the bias
la variable|the variable
la méthode|the method
la vérification|verification
le raisonnement|the reasoning
le paradoxe|the paradox
la nuance|the nuance
la concession|the concession
la réfutation|the rebuttal
la justification|the justification
la déduction|the deduction
la cohérence|coherence
la contradiction|the contradiction
la perspective|the perspective
la diffusion|dissemination
la transmission|transmission
la vulgarisation|the explanation of specialist knowledge to the public
le patrimoine|heritage
la restauration|restoration
la création|creation
la propriété intellectuelle|intellectual property
la censure|censorship
la liberté d’expression|freedom of expression
la représentation|representation
` },
  { level:'C1', fr:'Cette analyse met en lumière {word}.', en:'This analysis highlights {gloss}.', entries:`
la prérogative|the special right attached to a role
la dérogation|the authorized exception to a rule
la jurisprudence|case law
la recevabilité|admissibility
la légitimité|legitimacy
la prééminence|predominance
la subsidiarité|the principle of deciding at the most local suitable level
la concertation|consultation between the parties involved
la préconisation|the recommendation
la pérennité|long-term survival
la résilience|resilience
la vulnérabilité|vulnerability
la disparité|the disparity
la stratification|the division into layers
la polarisation|polarization
la stigmatisation|stigmatization
la paupérisation|growing poverty
la gentrification|gentrification
la marchandisation|the turning of something into a product for sale
la financiarisation|the growing influence of finance
la déréglementation|deregulation
la mutualisation|the pooling of resources
la péréquation|the redistribution of resources to reduce inequalities
la soutenabilité|long-term sustainability
la solvabilité|the ability to pay debts
la liquidité|the availability of cash
la volatilité|volatility
la spéculation|speculation
la dépréciation|the loss in value
la revalorisation|the upward reassessment of value
la conjecture|the unproven explanation
la prémisse|the starting assumption
la présupposition|the underlying assumption
la vraisemblance|plausibility
la contingence|dependence on circumstances
la subjectivité|subjectivity
la réflexivité|reflection on one’s own methods and position
la distanciation|critical distance
la polysémie|the existence of several meanings for one word
la connotation|the associated meaning
la dénotation|the literal meaning
la rhétorique|the art of persuasive expression
la dialectique|reasoning through opposing ideas
la digression|the departure from the main topic
la réticence|reluctance
la connivence|the tacit understanding
la bienveillance|goodwill
la complaisance|the excessive willingness to please
la désinvolture|casual disregard
la circonspection|cautious consideration
la perspicacité|insightfulness
la lucidité|clear-sightedness
la clairvoyance|foresight
la sagacité|sound judgment
la ténacité|tenacity
la désillusion|disillusionment
la désaffection|the loss of interest or support
la réprobation|disapproval
la défiance|distrust
la dissension|disagreement within a group
` },
  { level:'C2', fr:'Cet essai explore {word} sans simplifier le débat.', en:'This essay explores {gloss} without oversimplifying the debate.', entries:`
la pusillanimité|the lack of courage to act
la magnanimité|generosity toward someone one could punish
la mansuétude|leniency
la probité|honesty and moral integrity
la turpitude|shameful moral baseness
la prévarication|the abuse of public office for personal gain
la concussion|the unlawful collection of money by an official
la vénalité|the willingness to be bought
la prébende|the lucrative position obtained through favor
la gabegie|wasteful and chaotic management
la déréliction|the feeling of utter abandonment
la décrépitude|advanced physical decline
la déliquescence|the gradual disintegration
la déshérence|the lack of an heir or claimant
la déshumanisation|dehumanization
la réification|the treatment of a person or idea as a thing
la chosification|the reduction of someone to an object
la vacuité|emptiness of meaning
la vanité|the excessive pride in oneself
la fatuité|smug self-importance
la suffisance|self-satisfied arrogance
la morgue|haughty contempt
la superbe|arrogant pride
la componction|the solemn display of contrition
la contrition|deep remorse
la résipiscence|the recognition of wrongdoing and return to better conduct
la palinodie|the public reversal of an earlier position
la tergiversation|the evasive delay in making a decision
la procrastination|the habit of putting things off
la velléité|the weak intention that leads to no action
la préciosité|the affected refinement of language or manners
la versatilité|the tendency to change opinions unpredictably
la vindicte|the collective desire to punish someone
la duplicité|deliberate double-dealing
la dissimulation|the deliberate concealment
la circonlocution|the indirect way of expressing something
la litote|the understatement that suggests more than it says
la prétérition|the mention of something while claiming not to mention it
la synecdoque|the figure of speech using a part for the whole or vice versa
la métonymie|the figure of speech naming something through a related thing
la syllepse|the use of a word in two senses at once
le zeugma|the linking of two different senses through one word
la paronomase|the wordplay based on similar sounds
la diatribe|the bitter verbal attack
la philippique|the forceful speech condemning someone
la logorrhée|the excessive and uncontrolled flow of words
la logomachie|the argument over words rather than substance
la sophistique|the use of clever but misleading reasoning
la casuistique|the case-by-case reasoning about moral questions
la téléologie|the explanation of events by their purpose or end
la phénoménologie|the study of experience as it is lived
la maïeutique|the use of questions to help someone reach an understanding
la facticité|the concrete conditions of an individual’s existence
la quiddité|the essential nature of a thing
la singularité|the unique character
la consubstantialité|the sharing of the same underlying nature
la consilience|the convergence of evidence from different fields
la sérendipité|the valuable discovery made by chance
la sapience|deep wisdom
la sapidité|the quality of having a pleasing taste
` },
];
