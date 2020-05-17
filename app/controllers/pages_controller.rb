class PagesController < ApplicationController
    include ApplicationHelper
    include ActionView::Helpers::NumberHelper

    def index

        Statistic.new(
            timestamp: DateTime.now.to_i,
            url: request.headers["HTTP_REFERER"].to_s,
            target: params.to_json,
            session_id: Digest::SHA256.hexdigest(request.remote_ip.to_s + " " +  request.env['HTTP_USER_AGENT'].to_s + Rails.application.secrets.secret_key_base.to_s)
        ).save


        year = params[:year] || "2020"

        # =========================================
        # für DIENSTNEHMER
        # =========================================

        # Geringfügigkeitsgrenze https://www.wko.at/service/arbeitsrecht-sozialrecht/beitragswesen-dienstnehmer-2019.html
        @gfgk_year = { "2018": 438.05, "2019": 446.81, "2020": 460.66 }.stringify_keys
        # Höchstbemessungsgrundlage https://www.wko.at/service/arbeitsrecht-sozialrecht/beitragswesen-dienstnehmer-2019.html
        @hbgl_year = {"2018": 5130, "2019": 5220, "2020": 5370 }.stringify_keys

        # SV Beitragssätze -----------
        # Krankenversicherung https://www.wko.at/service/arbeitsrecht-sozialrecht/beitragswesen-dienstnehmer-2019.html
        @dn_KV_beitrag_year = { "2018": 3.87, "2019": 3.87, "2020": 3.87 }.stringify_keys
        # Pensionsversicherung https://www.wko.at/service/arbeitsrecht-sozialrecht/beitragswesen-dienstnehmer-2019.html
        @dn_PV_beitrag_year = { "2018": 10.25, "2019": 10.25, "2020": 10.25 }.stringify_keys
        # Arbeitslosenversicherung https://www.wko.at/service/arbeitsrecht-sozialrecht/beitragswesen-dienstnehmer-2019.html
        @dn_AV_beitrag_year = { "2018": 3, "2019": 3, "2020": 3 }.stringify_keys
        # Arbeiterkammer
        @dn_AK_beitrag_year = { "2018": 0.5, "2019": 0.5, "2020": 0.5 }.stringify_keys
        # Wohnbauförderung
        @dn_WF_beitrag_year = { "2018": 0.5, "2019": 0.5, "2020": 0.5 }.stringify_keys

        # Insolvenzentgelt Abschläge
        # Grenze für Insolvenzentgelt Abschlag von 1%
        @ie_abschlag_1p_year = { "2018": 1696, "2019": 1987, "2020": 2049 }.stringify_keys
        # Grenze für Insolvenzentgelt Abschlag von 2%
        @ie_abschlag_2p_year = { "2018": 1506, "2019": 1834, "2020": 1891 }.stringify_keys
        # Grenze für Insolvenzentgelt Abschlag von 3%
        @ie_abschlag_3p_year = { "2018": 1381, "2019": 1681, "2020": 1733 }.stringify_keys

        # Freibetrag Lohnsteuer 13. Bezug
        @lst_frei_13_year = { "2018": 620, "2019": 620, "2020": 620 }.stringify_keys
        # Werbungskostenpauschale
        @wk_pauschale_year = { "2018": 132, "2019": 132, "2020": 132 }.stringify_keys
        # Sonderausgaben
        @sonder_ausgaben_year = { "2018": 60, "2019": 60, "2020": 60 }.stringify_keys
        # Verkehrsabsetzbetrag
        @verkehr_ab_year = { "2018": 400, "2019": 400, "2020": 400 }.stringify_keys

        # Werte für Berechnungsgrundlagen =========
        brutto_monat = params[:brutto_gehalt].to_f

        @gfgk = @gfgk_year[year]                    # Geringfügigkeitsgrenze
        @hbgl = @hbgl_year[year]                    # Höchstbemessungsgrundlage
        @dn_KV_beitrag = @dn_KV_beitrag_year[year]    # Krankenversicherung
        @dn_PV_beitrag = @dn_PV_beitrag_year[year]    # Pensionsversicherung
        @dn_AV_beitrag = @dn_AV_beitrag_year[year]    # Arbeitslosenversicherung
        @dn_AK_beitrag = @dn_AK_beitrag_year[year]    # Arbeiterkammer
        @dn_WF_beitrag = @dn_WF_beitrag_year[year]    # Wohnbauförderung

        # Insolvenzentgelt Abschläge
        @ie_abschlag_1p = @ie_abschlag_1p_year[year]    # Grenze für Insolvenzentgelt Abschlag von 1%
        @ie_abschlag_2p = @ie_abschlag_2p_year[year]    # Grenze für Insolvenzentgelt Abschlag von 2%
        @ie_abschlag_3p = @ie_abschlag_3p_year[year]    # Grenze für Insolvenzentgelt Abschlag von 3%

        # Lohnsteuer -----------------
        @lst_frei_13 = @lst_frei_13_year[year]            # Freibetrag Lohnsteuer 13. Bezug
        @wk_pauschale = @wk_pauschale_year[year]        # Werbungskostenpauschale
        @sonder_ausgaben = @sonder_ausgaben_year[year]    # Sonderausgaben
        @verkehr_ab = @verkehr_ab_year[year]            # Verkehrsabsetzbetrag

        # Berechnung Sozialversicherung ===========
        # Krankenversicherung
        if (brutto_monat < @gfgk)
            m_kv = 0
        else
            m_kv = [brutto_monat, @hbgl].min * (@dn_KV_beitrag / 100)
        end
        @monatlich_KV = "€ " + number_with_precision(m_kv, precision: 2, delimiter: ',').to_s
        @jahres_KV = "€ " + number_with_precision(m_kv*14, precision: 2, delimiter: ',').to_s

        # Pensionsversicherung
        if (brutto_monat < @gfgk)
            m_pv = 0
        else
            m_pv = [brutto_monat, @hbgl].min * (@dn_PV_beitrag / 100)
        end
        @monatlich_PV = "€ " + number_with_precision(m_pv, precision: 2, delimiter: ',').to_s
        @jahres_PV = "€ " + number_with_precision(m_pv*14, precision: 2, delimiter: ',').to_s

        # Arbeitslosenversicherung
        if (brutto_monat < @gfgk)
            m_av = 0
        else
            m_av = [brutto_monat, @hbgl].min * (@dn_AV_beitrag.to_f / 100)
        end
        @monatlich_AV = "€ " + number_with_precision(m_av, precision: 2, delimiter: ',').to_s
        @jahres_AV = "€ " + number_with_precision(m_av*14, precision: 2, delimiter: ',').to_s

        # Arbeiterkammerumlage
        if (brutto_monat < @gfgk)
            m_ak = 0
        else
            m_ak = [brutto_monat, @hbgl].min * (@dn_AK_beitrag.to_f / 100)
        end
        @monatlich_AK = "€ " + number_with_precision(m_ak, precision: 2, delimiter: ',').to_s
        @mon_13_14_AK = "€ 0.00"
        @jahres_AK = "€ " + number_with_precision(m_ak*12, precision: 2, delimiter: ',').to_s

        # Wohnbauförderung
        if (brutto_monat < @gfgk)
            m_wf = 0
        else
            m_wf = [brutto_monat, @hbgl].min * (@dn_WF_beitrag.to_f / 100)
        end
        @monatlich_WF = "€ " + number_with_precision(m_wf, precision: 2, delimiter: ',').to_s
        @mon_13_14_WF = "€ 0.00"
        @jahres_WF = "€ " + number_with_precision(m_wf*12, precision: 2, delimiter: ',').to_s

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
        @monatlich_IE_abschlag = "€ " + number_with_precision(m_ie, precision: 2, delimiter: ',').to_s
        @mon_13_14_IE_abschlag = "€ " + number_with_precision(m_ie, precision: 2, delimiter: ',').to_s
        @jahres_IE_abschlag = "€ " + number_with_precision(m_ie*14, precision: 2, delimiter: ',').to_s

        # Gesamtsumme Sozialversicherung
        m_sv = m_kv + m_pv + m_av + m_ak + m_wf + m_ie
        @monatlich_SV = "€ " + number_with_precision(m_sv, precision: 2, delimiter: ',').to_s
        m_1314 = m_kv + m_pv + m_av + m_ie
        @mon_13_14_SV = "€ " + number_with_precision(m_1314, precision: 2, delimiter: ',').to_s
        @jahres_SV = "€ " + number_with_precision((m_kv + m_pv + m_av + m_ie)*14 + (m_ak + m_wf)*12, precision: 2, delimiter: ',').to_s

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

        @monatlich_LSt = "€ " + number_with_precision(lst/12, precision: 2, delimiter: ',').to_s
        @mon13_LSt = "€ " + number_with_precision(m13_LSt, precision: 2, delimiter: ',').to_s
        @mon14_LSt = "€ " + number_with_precision(m14_LSt, precision: 2, delimiter: ',').to_s
        @jahres_LSt = "€ " + number_with_precision(lst + m13_LSt + m14_LSt, precision: 2, delimiter: ',').to_s

        # Nettoberechnung ==================
        @monatlich_netto = "€ " + number_with_precision(brutto_monat - m_sv - (lst/12), precision: 2, delimiter: ',').to_s
        @mon13_netto = "€ " + number_with_precision(brutto_monat - m_1314 - m13_LSt, precision: 2, delimiter: ',').to_s
        @mon14_netto = "€ " + number_with_precision(brutto_monat - m_1314 - m14_LSt, precision: 2, delimiter: ',').to_s
        @jahres_netto = "€ " + number_with_precision((brutto_monat - m_sv - (lst/12))*12 + (brutto_monat - m_1314 - m13_LSt) + (brutto_monat - m_1314 - m14_LSt), precision: 2, delimiter: ',').to_s


        # =========================================
        # für DIENSTGEBER
        # =========================================

        # SV Beitragssätze -----------
        # Krankenversicherung https://www.wko.at/service/arbeitsrecht-sozialrecht/beitragswesen-dienstnehmer-2019.html
        @dg_KV_beitrag_year = { "2018": 3.78, "2019": 3.78, "2020": 3.78 }.stringify_keys
        # Unfallversicherung
        @dg_UV_beitrag_year = { "2018": 1.3, "2019": 1.2, "2020": 1.2 }.stringify_keys
        # Pensionsversicherung
        @dg_PV_beitrag_year = { "2018": 12.55, "2019": 12.55, "2020": 12.55 }.stringify_keys
        # Arbeitslosenversicherung
        @dg_AV_beitrag_year = { "2018": 3.00, "2019": 3.00, "2020": 3.00 }.stringify_keys
        # Wohnbauförderung
        @dg_WF_beitrag_year = { "2018": 0.5, "2019": 0.5, "2020": 0.5 }.stringify_keys
        # Insolvenzentgelts-Zuschlag
        @dg_IE_beitrag_year = { "2018": 0.35, "2019": 0.35, "2020": 0.20 }.stringify_keys
        
        # Lohnnebenkosten -----------
        @DB_Satz_year = { "2018": 3.9, "2019": 3.9, "2020": 3.9 }.stringify_keys
        @Freibetrag_DB_year = { "2018": 1095, "2019": 1095, "2020": 1095 }.stringify_keys
        @Einschleifbetrag_DB_year = { "2018": 1460, "2019": 1460, "2020": 1460 }.stringify_keys
        @DZ_Satz_bundesland_year = {
            "2018": {
                "bgld" => 0.44,
                "ktn"  => 0.41,
                "noe"  => 0.40,
                "ooe"  => 0.36,
                "sbg"  => 0.42,
                "stmk" => 0.39,
                "trl"  => 0.43,
                "vbg"  => 0.39,
                "wien" => 0.40 },
            "2019": {
                "bgld" => 0.42,
                "ktn"  => 0.39,
                "noe"  => 0.38,
                "ooe"  => 0.34,
                "sbg"  => 0.40,
                "stmk" => 0.37,
                "trl"  => 0.41,
                "vbg"  => 0.37,
                "wien" => 0.38 },
            "2020": {
                "bgld" => 0.42,
                "ktn"  => 0.39,
                "noe"  => 0.38,
                "ooe"  => 0.34,
                "sbg"  => 0.39,
                "stmk" => 0.37,
                "trl"  => 0.41,
                "vbg"  => 0.37,
                "wien" => 0.38 }
        }.stringify_keys
        @Freibetrag_DZ_year = { "2018": 1095, "2019": 1095, "2020": 1095 }.stringify_keys
        @Einschleifbetrag_DZ_year = { "2018": 1460, "2019": 1460, "2020": 1460 }.stringify_keys

        @KommSt_year = { "2018": 3, "2019": 3, "2020": 3 }.stringify_keys
        @Freibetrag_KommSt_year = { "2018": 1095, "2019": 1095, "2020": 1095 }.stringify_keys
        @Einschleifbetrag_KommSt_year = { "2018": 1460, "2019": 1460, "2020": 1460 }.stringify_keys

        @BMVK_Satz_year = { "2018": 1.53, "2019": 1.53, "2020": 1.53 }.stringify_keys

        # Werte für Berechnungsgrundlagen =========
        @dg_KV_beitrag = @dg_KV_beitrag_year[year]    # Krankenversicherung
        @dg_UV_beitrag = @dg_UV_beitrag_year[year]    # Unfallversicherung
        @dg_PV_beitrag = @dg_PV_beitrag_year[year]    # Pensionsversicherung
        @dg_AV_beitrag = @dg_AV_beitrag_year[year]    # Arbeitslosenversicherung
        @dg_WF_beitrag = @dg_WF_beitrag_year[year]    # Wohnbauförderung
        @dg_IE_beitrag = @dg_IE_beitrag_year[year]    # Insolvenzentgelts-Zuschlag

        # Berechnung Sozialversicherung ===========
        # Krankenversicherung
        if (brutto_monat < @gfgk)
            dg_m_kv = 0
        else
            dg_m_kv = [brutto_monat, @hbgl].min * (@dg_KV_beitrag / 100)
        end
        @monatlich_dg_KV = "€ " + number_with_precision(dg_m_kv, precision: 2, delimiter: ',').to_s
        @jahres_dg_KV = "€ " + number_with_precision(dg_m_kv*14, precision: 2, delimiter: ',').to_s

        # Unfallversicherung
        if (brutto_monat < @gfgk)
            dg_m_uv = 0
        else
            dg_m_uv = [brutto_monat, @hbgl].min * (@dg_UV_beitrag / 100)
        end
        @monatlich_dg_UV = "€ " + number_with_precision(dg_m_uv, precision: 2, delimiter: ',').to_s
        @jahres_dg_UV = "€ " + number_with_precision(dg_m_uv*14, precision: 2, delimiter: ',').to_s

        # Pensionsversicherung
        if (brutto_monat < @gfgk)
            dg_m_pv = 0
        else
            dg_m_pv = [brutto_monat, @hbgl].min * (@dg_PV_beitrag / 100)
        end
        @monatlich_dg_PV = "€ " + number_with_precision(dg_m_pv, precision: 2, delimiter: ',').to_s
        @jahres_dg_PV = "€ " + number_with_precision(dg_m_pv*14, precision: 2, delimiter: ',').to_s

        # Arbeitslosenversicherung
        if (brutto_monat < @gfgk)
            dg_m_av = 0
        else
            dg_m_av = [brutto_monat, @hbgl].min * (@dg_AV_beitrag.to_f / 100)
        end
        @monatlich_dg_AV = "€ " + number_with_precision(dg_m_av, precision: 2, delimiter: ',').to_s
        @jahres_dg_AV = "€ " + number_with_precision(dg_m_av*14, precision: 2, delimiter: ',').to_s

        # Wohnbauförderung
        if (brutto_monat < @gfgk)
            dg_m_wf = 0
        else
            dg_m_wf = [brutto_monat, @hbgl].min * (@dg_WF_beitrag.to_f / 100)
        end
        @monatlich_dg_WF = "€ " + number_with_precision(dg_m_wf, precision: 2, delimiter: ',').to_s
        @mon_13_14_dg_WF = "€ 0.00"
        @jahres_dg_WF = "€ " + number_with_precision(dg_m_wf*12, precision: 2, delimiter: ',').to_s

        # Insolvenzentgeltszuschlag
        if (brutto_monat < @gfgk)
            dg_m_ie = 0
        else
            dg_m_ie = [brutto_monat, @hbgl].min * (@dg_IE_beitrag.to_f / 100)
        end
        @monatlich_dg_IE = "€ " + number_with_precision(dg_m_ie, precision: 2, delimiter: ',').to_s
        @jahres_dg_IE = "€ " + number_with_precision(dg_m_ie*14, precision: 2, delimiter: ',').to_s

        # Gesamtsumme Sozialversicherung
        dg_m_sv = dg_m_kv + dg_m_uv + dg_m_pv + dg_m_av + dg_m_wf + dg_m_ie
        @monatlich_dg_SV = "€ " + number_with_precision(dg_m_sv, precision: 2, delimiter: ',').to_s
        dg_m_1314 = dg_m_kv + dg_m_uv + dg_m_pv + dg_m_av + dg_m_ie
        @mon_13_14_dg_SV = "€ " + number_with_precision(dg_m_1314, precision: 2, delimiter: ',').to_s
        @jahres_dg_SV = "€ " + number_with_precision((dg_m_kv + dg_m_uv + dg_m_pv + dg_m_av + dg_m_ie)*14 + dg_m_wf*12, precision: 2, delimiter: ',').to_s

        # Berechnung Lohnnebenkosten ==============
        @DB_Satz = @DB_Satz_year[year]    # Dienstgeber-Beitrags Satz
        @Freibetrag_DB = @Freibetrag_DB_year[year]
        @Einschleifbetrag_DB = @Einschleifbetrag_DB_year[year]

        @DZ_Satz_bundesland = @DZ_Satz_bundesland_year[year]
        bundesland = params[:bundesland] || "wien"
        @DZ_Satz = @DZ_Satz_bundesland[bundesland]
        @Freibetrag_DZ = @Freibetrag_DZ_year[year]
        @Einschleifbetrag_DZ = @Einschleifbetrag_DZ_year[year]

        @KommSt = @KommSt_year[year]
        @Freibetrag_KommSt = @Freibetrag_KommSt_year[year]
        @Einschleifbetrag_KommSt = @Einschleifbetrag_KommSt_year[year]

        @BMVK_Satz = @BMVK_Satz_year[year]

        # Dienstgeberbeitrag
        if (brutto_monat > @Einschleifbetrag_DB)
            dg_m_db = brutto_monat * (@DB_Satz.to_f / 100)
        else
            dg_m_db = [((brutto_monat - @Freibetrag_DB) * (@DB_Satz.to_f / 100)), 0].max
        end
        @monatlich_dg_DB = "€ " + number_with_precision(dg_m_db, precision: 2, delimiter: ',').to_s
        @jahres_dg_DB = "€ " + number_with_precision(dg_m_db*14, precision: 2, delimiter: ',').to_s

        # Zuschlag zum Dienstgeberbeitrag
        if (brutto_monat > @Einschleifbetrag_DZ)
            dg_m_dz = brutto_monat * (@DZ_Satz.to_f / 100)
        else
            dg_m_dz = [((brutto_monat - @Freibetrag_DZ) * (@DZ_Satz.to_f / 100)), 0].max
        end
        @monatlich_dg_DZ = "€ " + number_with_precision(dg_m_dz, precision: 2, delimiter: ',').to_s
        @jahres_dg_DZ = "€ " + number_with_precision(dg_m_dz*14, precision: 2, delimiter: ',').to_s

        # Kommunalsteuer
        if (brutto_monat > @Einschleifbetrag_KommSt)
            dg_m_ks = brutto_monat * (@KommSt.to_f / 100)
        else
            dg_m_ks = [((brutto_monat - @Freibetrag_KommSt) * (@KommSt.to_f / 100)), 0].max
        end
        @monatlich_dg_KS = "€ " + number_with_precision(dg_m_ks, precision: 2, delimiter: ',').to_s
        @jahres_dg_KS = "€ " + number_with_precision(dg_m_ks*14, precision: 2, delimiter: ',').to_s

        # Betriebliche Mitarbeiter Vorsorke Kasse
        dg_m_bv = brutto_monat * (@BMVK_Satz.to_f / 100)
        @monatlich_dg_BV = "€ " + number_with_precision(dg_m_bv, precision: 2, delimiter: ',').to_s
        @jahres_dg_BV = "€ " + number_with_precision(dg_m_bv*14, precision: 2, delimiter: ',').to_s

        # Gesamtsumme Lohnnebenkosten
        dg_m_lnk = dg_m_db + dg_m_dz + dg_m_ks + dg_m_bv
        @monatlich_dg_LNK = "€ " + number_with_precision(dg_m_lnk, precision: 2, delimiter: ',').to_s
        @jahres_dg_LNK = "€ " + number_with_precision(dg_m_lnk*14, precision: 2, delimiter: ',').to_s

        # Personalkosten
        dg_m_pk = brutto_monat + dg_m_sv + dg_m_lnk
        dg_m1314_pk = brutto_monat + dg_m_1314 + dg_m_lnk
        @monatlich_dg_gesamt = "€ " + number_with_precision(dg_m_pk, precision: 2, delimiter: ',').to_s
        @mon1314_dg_gesamt = "€ " + number_with_precision(dg_m1314_pk, precision: 2, delimiter: ',').to_s
        @jahres_dg_gesamt = "€ " + number_with_precision(dg_m_pk*12 + dg_m1314_pk*2, precision: 2, delimiter: ',').to_s
    end

    def dienstnehmer
        redirect_to root_path(mode: "dienstnehmer", brutto_gehalt: params[:brutto_gehalt], year: params[:dn_year])
    end

    def dienstgeber
        redirect_to root_path(mode: "dienstgeber", brutto_gehalt: params[:dg_brutto_gehalt], bundesland: params[:dg_bundesland], year: params[:dg_year])
    end

    def est
        bmgl = params[:est_bmgl].to_f
        est_val = berechne_Lohnsteuer(bmgl)

        flash[:success] = "<strong>Einkommenssteuer:</strong> € " + 
            number_with_precision(est_val, precision: 2, delimiter: ',').to_s
        redirect_to root_path(mode: "est", bmgl: params[:est_bmgl])
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

    def favicon
        send_file 'public/favicon.ico', type: 'image/x-icon', disposition: 'inline'
    end
    
end
