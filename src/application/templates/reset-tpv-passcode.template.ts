/* eslint-disable @typescript-eslint/dot-notation */
import mjml2html from 'mjml'
import { companyLogo } from '@app/constants/default-values'

export function resetTpvPasscodeTemplate (data: { serialNumber: string, passcode: string }): string {
  const mjml = `
  <mjml>
    <mj-head>
      <mj-font name="Montserrat" href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap" />
      <mj-style>
        * { font-feature-settings: "pnum" on, "lnum" on; }
      </mj-style>
      <mj-attributes>
        <mj-class name="primary" color="#001650" />
        <mj-class name="button" background-color="#00BD58" border-radius="24px" />
        <mj-all font-family="Montserrat, Arial" />
      </mj-attributes>
    </mj-head>
    <mj-body background-color="#eeeeee">
      <mj-section></mj-section>

      <mj-section background-color="#044ed7">
        <mj-column>
          <mj-text color="#B8D6F6" font-weight="800" font-size="18px" align="center">
            Codigo de verificación restablecido
          </mj-text>
        </mj-column>
      </mj-section>    

      <mj-section background-color="white">
        <mj-column width="16%">
          <mj-image src="${companyLogo}" padding="0"></mj-image>
        </mj-column>
      </mj-section>

      <mj-section background-color="white" padding="0px">
        <mj-column>
          <mj-text font-size="13px" align="center">
            El nuevo código de la terminal es:
          </mj-text>
          <mj-text font-weight="500" font-size="28px" align="center" color="#333333">
            ${String(data.passcode)}
          </mj-text>
        </mj-column>

        <mj-column width="80%" padding="40px 20px">
          <mj-text>Numero de serie: ${String(data.serialNumber)}</mj-text>
          <mj-text>Si no solicitaste este código, puedes ignorar este mensaje.</mj-text>
          <mj-divider border-width="1px" border-color="#ebebec" />
          <mj-text font-size="12px" color="#888888">
            Este correo fue generado automáticamente, por favor no respondas.
          </mj-text>
        </mj-column>

      </mj-section>
      <mj-section></mj-section>
    </mj-body>
  </mjml>
  `
  const { html } = mjml2html(mjml)
  return html
}
