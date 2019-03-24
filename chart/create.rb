require 'csv'

def calc(brutto_monat)
    # Werte für Berechnungsgrundlagen =========
    brutto_monat
    @gfgk = 438.05                            # Geringfügigkeitsgrenze
    @hbgl = 5130                            # Höchstbemessungsgrundlage

    # SV Beitragssätze -----------
    @dn_KV_beitrag = 3.87                    # Krankenversicherung
    @dn_PV_beitrag = 10.25                    # Pensionsversicherung
    @dn_AV_beitrag = 3                        # Arbeitslosenversicherung
    @dn_AK_beitrag = 0.5                    # Arbeiterkammer
    @dn_WF_beitrag = 0.5                    # Wohnbauförderung

    # Insolvenzentgelt Abschläge
    @ie_abschlag_1p    = 1696                    # Grenze für Insolvenzentgelt Abschlag von 1%
    @ie_abschlag_2p    = 1506                    # Grenze für Insolvenzentgelt Abschlag von 2%
    @ie_abschlag_3p    = 1381                    # Grenze für Insolvenzentgelt Abschlag von 3%

    # Lohnsteuer -----------------
    @lst_frei_13 = 620
    @wk_pauschale = 132                        # Werbungskostenpauschale
    @sonder_ausgaben = 60                    # Sonderausgaben
    @verkehr_ab = 400

    # Berechnung Sozialversicherung ===========
    # Krankenversicherung
    if (brutto_monat < @gfgk)
        m_kv = 0
    else
        m_kv = [brutto_monat, @hbgl].min * (@dn_KV_beitrag / 100)
    end

    # Pensionsversicherung
    if (brutto_monat < @gfgk)
        m_pv = 0
    else
        m_pv = [brutto_monat, @hbgl].min * (@dn_PV_beitrag / 100)
    end

    # Arbeitslosenversicherung
    if (brutto_monat < @gfgk)
        m_av = 0
    else
        m_av = [brutto_monat, @hbgl].min * (@dn_AV_beitrag.to_f / 100)
    end

    # Arbeiterkammerumlage
    if (brutto_monat < @gfgk)
        m_ak = 0
    else
        m_ak = [brutto_monat, @hbgl].min * (@dn_AK_beitrag.to_f / 100)
    end

    # Wohnbauförderung
    if (brutto_monat < @gfgk)
        m_wf = 0
    else
        m_wf = [brutto_monat, @hbgl].min * (@dn_WF_beitrag.to_f / 100)
    end

    # Insolvenzentgelt Abschlag
    if (brutto_monat < @gfgk)
        m_ie = 0
    else
        if brutto_monat < @ie_abschlag_3p
            m_ie = brutto_monat * -0.03
        elsif brutto_monat < @ie_abschlag_2p
            m_ie = brutto_monat * -0.02
        elsif brutto_monat < @ie_abschlag_1p
            m_ie = brutto_monat * -0.01
        else
            m_ie = 0
        end
    end

    # Gesamtsumme Sozialversicherung
    m_sv = m_kv + m_pv + m_av + m_ak + m_wf + m_ie
    m_1314 = m_kv + m_pv + m_av + m_ie

    # Lohnsteuerberechnung ============
    # LSt Bemessungsgrundlage
    bmgl_lst = (brutto_monat - m_sv)*12
    lst_bmgl = bmgl_lst - @wk_pauschale - @sonder_ausgaben

    # Lohnsteuer
    if brutto_monat>1050
        lst_vor_ab = berechne_Lohnsteuer(lst_bmgl)
        lst = [(lst_vor_ab - @verkehr_ab), 0].max
        m13_LSt = [((brutto_monat - m_1314 - @lst_frei_13)*0.06), 0].max
        m14_LSt = [((brutto_monat - m_1314)*0.06), 0].max
    else
        lst = 0
        m13_LSt = 0
        m14_LSt = 0
    end


    return (brutto_monat - m_sv - (lst/12))*12 + (brutto_monat - m_1314 - m13_LSt) + (brutto_monat - m_1314 - m14_LSt)
end

def berechne_Lohnsteuer(bmgl)
    if bmgl <= 11000
        0
    elsif bmgl > 11000 and bmgl <= 18000
        (bmgl - 11000)*0.25
    elsif bmgl > 18000 and bmgl <= 31000
        (bmgl - 18000)*0.35 + 1750
    elsif bmgl > 31000 and bmgl <= 60000
        (bmgl - 31000)*0.42 + 6300
    elsif bmgl > 60000 and bmgl <= 90000
        (bmgl - 60000)*0.48 + 18480
    elsif bmgl > 90000 and bmgl <= 1000000
        (bmgl - 90000)*0.50 + 32880
    else
        (bmgl - 1000000)*0.55 + 487880
    end

end

CSV.open("brutto_netto_chart.csv", "w") do |csv|
    (1..15000).each do |i|
        csv << [i, calc(i)]
    end
end
