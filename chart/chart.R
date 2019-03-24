plot(data[1:2000,], xlab="Brutto-Monats-Gehalt", ylab="Netto-Jahres-Gehalt", 
     type='l', xaxt="n", yaxt="n")
xpos <- seq(0, 2000, by=250)
ypos <- seq(0, 20000, by=2500)
axis(1, at=xpos, labels=paste(format(xpos, big.mark=".", decimal.mark = ","), "€"))
axis(2, at=ypos, labels=paste(format(ypos, big.mark=".", decimal.mark = ","), "€"))

     