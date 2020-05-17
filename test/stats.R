# STATS for Brutto-Netto-Rechner

library(dplyr)

data <- jsonlite::fromJSON("https://brutto-netto.ownyourdata.eu/stats?password=1qF6lB9RJJx47P8erd")

# how often is link clicked
footer <- data[data$target=="oyd_footer",]
header <- data[data$target=="oyd_header",]
taxbert <- data[data$target=="taxbert",]
imprint <- data[data$target=="imprint",]
privacy <- data[data$target=="privacy",]
